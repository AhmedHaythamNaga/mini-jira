import { Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { v4 as uuidv4 } from 'uuid';
import { DYNAMO_CLIENT } from '../dynamodb/dynamodb.module';
import { buildPrimaryKey, getItemByIdVariants } from '../dynamodb/dynamodb-helpers';
import { NotificationsService } from '../notifications/notifications.service';
import {
  readRecordTeamId,
  recordMatchesTeamKeys,
  resolveTeamKeys,
} from '../teams/team-keys';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AuthUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class TasksService {
  private readonly tableName: string;
  private readonly usersTable: string;
  private readonly teamsTable: string;
  private readonly auditTable: string;
  private readonly originalsBucket: string;
  private readonly resizedBucket: string;
  private readonly s3: S3Client;
  private readonly cloudwatch: CloudWatchClient;

  constructor(
    @Inject(DYNAMO_CLIENT) private readonly dynamo: DynamoDBDocumentClient,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {
    const region = this.config.get<string>('AWS_REGION', 'us-east-1');
    this.tableName = this.config.get<string>('DYNAMODB_TASKS_TABLE', 'mini-jira-tasks');
    this.usersTable = this.config.get<string>('DYNAMODB_USERS_TABLE', 'mini-jira-users');
    this.teamsTable = this.config.get<string>('DYNAMODB_TEAMS_TABLE', 'mini-jira-teams');
    this.auditTable = this.config.get<string>('DYNAMODB_AUDIT_TABLE', 'mini-jira-audit');
    this.originalsBucket = this.config.get<string>('S3_ORIGINALS_BUCKET', 'mini-jira-original-images-2');
    this.resizedBucket = this.config.get<string>('S3_RESIZED_BUCKET', 'mini-jira-resized-images-2');
    this.s3 = new S3Client({ region });
    this.cloudwatch = new CloudWatchClient({ region });
  }

  async create(dto: CreateTaskDto, user: AuthUser) {
    const teamID = dto.teamID?.trim();
    if (!teamID) {
      throw new BadRequestException('teamID is required');
    }

    const now = new Date().toISOString();
    const task = {
      taskID: uuidv4(),
      title: dto.title,
      description: dto.description || '',
      status: 'To Do',
      priority: dto.priority || 'medium',
      deadline: dto.deadline || '',
      assigneeID: dto.assigneeID?.trim() || '',
      teamID,
      projectID: dto.projectID || '',
      imageKey: '',
      resizedImageKey: '',
      createdBy: user.userId,
      createdAt: now,
      updatedAt: now,
    };

    await this.dynamo.send(
      new PutCommand({ TableName: this.tableName, Item: task }),
    );

    // Publish TaskCreated metric
    await this.publishMetric('TaskCreated', 1, task.teamID);

    // If assignee is set, trigger SNS notification
    if (task.assigneeID) {
      await this.publishAssignment(task, user);
    }

    return task;
  }

  async findAll(user: AuthUser) {
    if (user.role === 'employee') {
      const teamKeys = await resolveTeamKeys(
        this.dynamo,
        this.teamsTable,
        user.teamId,
      );
      const byId = new Map<string, Record<string, unknown>>();

      const addItems = (items: Record<string, unknown>[]) => {
        for (const item of items) {
          const id = (item.taskID as string) ?? (item.taskId as string);
          if (id) byId.set(id, item);
        }
      };

      try {
        addItems(await this.findByAssignee(user.userId));
      } catch (err) {
        console.error('findByAssignee failed (GSI may be missing):', (err as Error).message);
      }

      for (const teamKey of teamKeys) {
        for (const indexName of ['teamID-index', 'teamId-index']) {
          try {
            const teamResult = await this.dynamo.send(
              new QueryCommand({
                TableName: this.tableName,
                IndexName: indexName,
                KeyConditionExpression: 'teamID = :teamID',
                ExpressionAttributeValues: { ':teamID': teamKey },
              }),
            );
            addItems((teamResult.Items || []) as Record<string, unknown>[]);
            break;
          } catch {
            try {
              const teamResult = await this.dynamo.send(
                new QueryCommand({
                  TableName: this.tableName,
                  IndexName: indexName,
                  KeyConditionExpression: 'teamId = :teamId',
                  ExpressionAttributeValues: { ':teamId': teamKey },
                }),
              );
              addItems((teamResult.Items || []) as Record<string, unknown>[]);
              break;
            } catch {
              // Try next index name variant.
            }
          }
        }
      }

      const scanned = await this.dynamo.send(
        new ScanCommand({ TableName: this.tableName }),
      );
      for (const item of (scanned.Items || []) as Record<string, unknown>[]) {
        const assignee =
          (item.assigneeID as string | undefined) ??
          (item.assigneeId as string | undefined);
        const visible =
          assignee === user.userId ||
          recordMatchesTeamKeys(item, teamKeys) ||
          (!user.teamId && !readRecordTeamId(item));
        if (visible) {
          const id = (item.taskID as string) ?? (item.taskId as string);
          if (id) byId.set(id, item);
        }
      }

      return Array.from(byId.values());
    }

    const result = await this.dynamo.send(
      new ScanCommand({ TableName: this.tableName }),
    );
    return result.Items || [];
  }

  async findOne(taskId: string, user?: AuthUser) {
    const item = await getItemByIdVariants(this.dynamo, this.tableName, taskId, [
      'taskID',
      'taskId',
    ]);
    if (!item) throw new NotFoundException(`Task ${taskId} not found`);

    if (user && user.role === 'employee') {
      const assignee =
        (item.assigneeID as string | undefined) ??
        (item.assigneeId as string | undefined);
      const isAssignee = assignee === user.userId;
      const teamKeys = await resolveTeamKeys(
        this.dynamo,
        this.teamsTable,
        user.teamId,
      );
      const onTeam = recordMatchesTeamKeys(
        item as Record<string, unknown>,
        teamKeys,
      );
      if (user.teamId && readRecordTeamId(item as Record<string, unknown>) && !onTeam && !isAssignee) {
        throw new ForbiddenException('You are not authorized to access this task');
      }
    }

    return item;
  }

  async findByProject(projectId: string, user: AuthUser) {
    // Scan with filter — not ideal at scale but works for demo
    const result = await this.dynamo.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'projectID = :pid',
        ExpressionAttributeValues: { ':pid': projectId },
      }),
    );
    let items = result.Items || [];

    // Team isolation
    if (user.role === 'employee' && user.teamId) {
      items = items.filter((i) => i.teamID === user.teamId);
    }
    return items;
  }

  async findByAssignee(assigneeId: string) {
    const result = await this.dynamo.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'assigneeID-index',
        KeyConditionExpression: 'assigneeID = :aid',
        ExpressionAttributeValues: { ':aid': assigneeId },
      }),
    );
    return result.Items || [];
  }

  async update(taskId: string, dto: UpdateTaskDto, user: AuthUser) {
    const existing = await this.findOne(taskId);

    // Authorization: managers can update any task; employees can only update tasks assigned to them
    if (user.role === 'employee' && existing.assigneeID !== user.userId) {
      throw new ForbiddenException('You can only update tasks assigned to you');
    }

    const expressionParts: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, any> = {};

    const fields: Array<[string, string, any]> = [
      ['title', '#ti', dto.title],
      ['description', '#de', dto.description],
      ['status', '#st', dto.status],
      ['priority', '#pr', dto.priority],
      ['deadline', '#dl', dto.deadline],
      ['assigneeID', '#ai', dto.assigneeID],
      ['teamID', '#tm', dto.teamID],
      ['projectID', '#pj', dto.projectID],
    ];

    for (const [field, alias, value] of fields) {
      if (value !== undefined) {
        const valAlias = alias.replace('#', ':');
        expressionParts.push(`${alias} = ${valAlias}`);
        names[alias] = field;
        values[valAlias] = value;
      }
    }

    if (expressionParts.length === 0) return existing;

    expressionParts.push('#ua = :ua');
    names['#ua'] = 'updatedAt';
    values[':ua'] = new Date().toISOString();

    const result = await this.dynamo.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: buildPrimaryKey(taskId, ['taskID', 'taskId'], existing),
        UpdateExpression: `SET ${expressionParts.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      }),
    );

    const updated = result.Attributes!;

    // If status changed, log it to audit and publish metrics
    if (dto.status && dto.status !== existing.status) {
      await this.writeAuditLog(taskId, user.userId, existing.status as string, dto.status);

      if (dto.status === 'Done') {
        await this.publishMetric('TaskClosed', 1, updated.teamID as string);
        // Calculate time-to-close in hours
        const createdAt = new Date(existing.createdAt as string).getTime();
        const closedAt = Date.now();
        const hoursToClose = (closedAt - createdAt) / (1000 * 60 * 60);
        await this.publishMetric('TaskTimeToClose', hoursToClose, updated.teamID as string);
      }
    }

    // If assignee changed, trigger notification
    if (dto.assigneeID && dto.assigneeID !== existing.assigneeID) {
      await this.publishAssignment(updated as any, user);
    }

    return updated;
  }

  async assign(taskId: string, assigneeId: string, user: AuthUser) {
    const existing = await this.findOne(taskId);
    const oldStatus = existing.status as string;

    const result = await this.dynamo.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: buildPrimaryKey(taskId, ['taskID', 'taskId'], existing),
        UpdateExpression: 'SET assigneeID = :aid, updatedAt = :ua',
        ExpressionAttributeValues: {
          ':aid': assigneeId,
          ':ua': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
      }),
    );

    const updated = result.Attributes!;
    await this.publishAssignment(updated as any, user);
    await this.writeAuditLog(taskId, user.userId, `unassigned`, `assigned:${assigneeId}`);

    return updated;
  }

  async remove(taskId: string) {
    const existing = await this.findOne(taskId);
    await this.dynamo.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: buildPrimaryKey(taskId, ['taskID', 'taskId'], existing),
      }),
    );
    return { deleted: true };
  }

  // ---- S3 Presigned URLs ----

  async getUploadUrl(taskId: string, contentType?: string) {
    await this.findOne(taskId);
    const key = `tasks/${taskId}/${uuidv4()}`;

    const command = new PutObjectCommand({
      Bucket: this.originalsBucket,
      Key: key,
      ...(contentType ? { ContentType: contentType } : {}),
    });

    const url = await getSignedUrl(this.s3, command, { expiresIn: 300 });
    return { uploadUrl: url, imageKey: key, contentType: contentType ?? null };
  }

  /** Upload via API (same-origin) — avoids S3 CORS issues from the browser. */
  async uploadImageData(taskId: string, imageBase64: string, contentType?: string) {
    await this.findOne(taskId);
    const base64Data = imageBase64.replace(/^data:image\/[a-z0-9+.-]+;base64,/i, '').trim();
    if (!base64Data) {
      throw new BadRequestException('Invalid image data');
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64Data, 'base64');
    } catch {
      throw new BadRequestException('Invalid image data');
    }
    if (!buffer.length) {
      throw new BadRequestException('Image file is empty');
    }

    const mime = contentType?.trim() || 'image/jpeg';
    const ext = mime.split('/')[1]?.split('+')[0] || 'jpg';
    const key = `tasks/${taskId}/${uuidv4()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.originalsBucket,
        Key: key,
        Body: buffer,
        ContentType: mime,
      }),
    );

    return this.attachImage(taskId, key);
  }

  async attachImage(taskId: string, imageKey: string) {
    const existing = await this.findOne(taskId);

    const result = await this.dynamo.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: buildPrimaryKey(taskId, ['taskID', 'taskId'], existing),
        UpdateExpression: 'SET imageKey = :ik, resizedImageKey = :rk, updatedAt = :ua',
        ExpressionAttributeValues: {
          ':ik': imageKey,
          ':rk': imageKey, // resized Lambda will use the same key in the resized bucket
          ':ua': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
      }),
    );
    return result.Attributes;
  }

  async getImageUrl(taskId: string, variant: 'original' | 'resized' = 'resized') {
    const task = await this.findOne(taskId);
    const key = variant === 'original' ? task.imageKey : task.resizedImageKey;
    if (!key) return { imageUrl: null };

    const bucket = variant === 'original' ? this.originalsBucket : this.resizedBucket;
    const command = new GetObjectCommand({ Bucket: bucket, Key: key as string });
    const url = await getSignedUrl(this.s3, command, { expiresIn: 3600 });
    return { imageUrl: url };
  }

  // ---- Private helpers ----

  private async publishAssignment(
    task: Record<string, unknown>,
    assigner: AuthUser,
  ) {
    const assigneeID =
      (task.assigneeID as string | undefined) ??
      (task.assigneeId as string | undefined);
    if (!assigneeID) return;

    let assigneeName = '';
    let assigneeEmail = '';
    try {
      const assignee = await getItemByIdVariants(
        this.dynamo,
        this.usersTable,
        assigneeID,
        ['userID', 'userId'],
      );
      if (assignee) {
        assigneeName = (assignee.name as string) ?? '';
        assigneeEmail = (assignee.email as string) ?? '';
      }
    } catch (err) {
      console.error(
        `Assignee lookup failed for ${assigneeID}:`,
        (err as Error).message,
      );
    }

    try {
      await this.notifications.publishTaskAssignment({
        taskID: (task.taskID as string) ?? (task.taskId as string),
        taskTitle: (task.title as string) ?? 'Untitled task',
        assigneeID,
        assigneeName,
        assigneeEmail,
        teamID:
          (task.teamID as string | undefined) ??
          (task.teamId as string | undefined),
        assignedBy: assigner.name,
      });
    } catch (err) {
      console.error(
        'Failed to publish SNS assignment:',
        (err as Error).message,
      );
    }
  }

  private async writeAuditLog(
    taskId: string,
    changedBy: string,
    oldStatus: string,
    newStatus: string,
  ) {
    await this.dynamo.send(
      new PutCommand({
        TableName: this.auditTable,
        Item: {
          LogID: uuidv4(),
          taskID: taskId,
          changedBy,
          oldStatus,
          newStatus,
          timestamp: new Date().toISOString(),
        },
      }),
    ).catch((err) => {
      console.error('Failed to write audit log:', err.message);
    });
  }

  private async publishMetric(name: string, value: number, teamId: string) {
    await this.cloudwatch.send(
      new PutMetricDataCommand({
        Namespace: 'MiniJira',
        MetricData: [
          {
            MetricName: name,
            Dimensions: [{ Name: 'TeamId', Value: teamId || 'unknown' }],
            Unit: name === 'TaskTimeToClose' ? 'None' : 'Count',
            Value: value,
          },
        ],
      }),
    ).catch((err) => {
      console.error(`Failed to publish metric ${name}:`, err.message);
    });
  }
}
