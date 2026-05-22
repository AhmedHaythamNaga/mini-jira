import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { v4 as uuidv4 } from 'uuid';
import { DYNAMO_CLIENT } from '../dynamodb/dynamodb.module';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AuthUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class TasksService {
  private readonly tableName: string;
  private readonly usersTable: string;
  private readonly auditTable: string;
  private readonly originalsBucket: string;
  private readonly resizedBucket: string;
  private readonly snsTopicArn: string;
  private readonly s3: S3Client;
  private readonly cloudwatch: CloudWatchClient;
  private readonly sns: SNSClient;

  constructor(
    @Inject(DYNAMO_CLIENT) private readonly dynamo: DynamoDBDocumentClient,
    private readonly config: ConfigService,
  ) {
    const region = this.config.get<string>('AWS_REGION', 'us-east-1');
    this.tableName = this.config.get<string>('DYNAMODB_TASKS_TABLE', 'mini-jira-tasks');
    this.usersTable = this.config.get<string>('DYNAMODB_USERS_TABLE', 'mini-jira-users');
    this.auditTable = this.config.get<string>('DYNAMODB_AUDIT_TABLE', 'mini-jira-audit');
    this.originalsBucket = this.config.get<string>('S3_ORIGINALS_BUCKET', 'mini-jira-original-images-2');
    this.resizedBucket = this.config.get<string>('S3_RESIZED_BUCKET', 'mini-jira-resized-images-2');
    this.snsTopicArn = this.config.get<string>('SNS_TASK_ASSIGNMENT_TOPIC_ARN', '');
    this.s3 = new S3Client({ region });
    this.cloudwatch = new CloudWatchClient({ region });
    this.sns = new SNSClient({ region });
  }

  async create(dto: CreateTaskDto, user: AuthUser) {
    const now = new Date().toISOString();
    const task = {
      taskID: uuidv4(),
      title: dto.title,
      description: dto.description || '',
      status: 'To Do',
      priority: dto.priority || 'medium',
      deadline: dto.deadline || '',
      assigneeID: dto.assigneeID || '',
      teamID: dto.teamID || '',
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
    // Team isolation: employees only see their team's tasks
    if (user.role === 'employee' && user.teamId) {
      const result = await this.dynamo.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'teamID-index',
          KeyConditionExpression: 'teamID = :teamID',
          ExpressionAttributeValues: { ':teamID': user.teamId },
        }),
      );
      return result.Items || [];
    }

    // Managers/admins see all tasks
    const result = await this.dynamo.send(
      new ScanCommand({ TableName: this.tableName }),
    );
    return result.Items || [];
  }

  async findOne(taskId: string, user?: AuthUser) {
    const result = await this.dynamo.send(
      new GetCommand({ TableName: this.tableName, Key: { taskID: taskId } }),
    );
    if (!result.Item) throw new NotFoundException(`Task ${taskId} not found`);

    // Enforce team isolation for employees
    if (user && user.role === 'employee' && user.teamId) {
      const itemTeam = result.Item.teamID as string | undefined;
      if (itemTeam && itemTeam !== user.teamId) {
        throw new ForbiddenException('You are not authorized to access this task');
      }
    }

    return result.Item;
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
        Key: { taskID: taskId },
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
        Key: { taskID: taskId },
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
    await this.findOne(taskId);
    await this.dynamo.send(
      new DeleteCommand({ TableName: this.tableName, Key: { taskID: taskId } }),
    );
    return { deleted: true };
  }

  // ---- S3 Presigned URLs ----

  async getUploadUrl(taskId: string) {
    await this.findOne(taskId); // ensure task exists
    const key = `tasks/${taskId}/${uuidv4()}`;

    const command = new PutObjectCommand({
      Bucket: this.originalsBucket,
      Key: key,
      ContentType: 'image/*',
    });

    const url = await getSignedUrl(this.s3, command, { expiresIn: 300 });
    return { uploadUrl: url, imageKey: key };
  }

  async attachImage(taskId: string, imageKey: string) {
    await this.findOne(taskId);

    const result = await this.dynamo.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { taskID: taskId },
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
    task: Record<string, any>,
    assigner: AuthUser,
  ) {
    if (!this.snsTopicArn) return;

    // Look up assignee details
    let assigneeName = '';
    let assigneeEmail = '';
    try {
      const assignee = await this.dynamo.send(
        new GetCommand({
          TableName: this.usersTable,
          Key: { userID: task.assigneeID },
        }),
      );
      if (assignee.Item) {
        assigneeName = assignee.Item.name as string;
        assigneeEmail = assignee.Item.email as string;
      }
    } catch {
      // If user lookup fails, proceed without email
    }

    await this.sns.send(
      new PublishCommand({
        TopicArn: this.snsTopicArn,
        Message: JSON.stringify({
          type: 'TASK_ASSIGNED',
          taskID: task.taskID,
          taskTitle: task.title,
          assigneeID: task.assigneeID,
          assigneeName,
          assigneeEmail,
          teamID: task.teamID,
          assignedBy: assigner.name,
          timestamp: new Date().toISOString(),
        }),
      }),
    ).catch((err) => {
      console.error('Failed to publish SNS assignment:', err.message);
    });
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
