"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const lib_dynamodb_2 = require("@aws-sdk/lib-dynamodb");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const client_cloudwatch_1 = require("@aws-sdk/client-cloudwatch");
const uuid_1 = require("uuid");
const dynamodb_module_1 = require("../dynamodb/dynamodb.module");
const dynamodb_helpers_1 = require("../dynamodb/dynamodb-helpers");
const notifications_service_1 = require("../notifications/notifications.service");
let TasksService = class TasksService {
    constructor(dynamo, config, notifications) {
        this.dynamo = dynamo;
        this.config = config;
        this.notifications = notifications;
        const region = this.config.get('AWS_REGION', 'us-east-1');
        this.tableName = this.config.get('DYNAMODB_TASKS_TABLE', 'mini-jira-tasks');
        this.usersTable = this.config.get('DYNAMODB_USERS_TABLE', 'mini-jira-users');
        this.auditTable = this.config.get('DYNAMODB_AUDIT_TABLE', 'mini-jira-audit');
        this.originalsBucket = this.config.get('S3_ORIGINALS_BUCKET', 'mini-jira-original-images-2');
        this.resizedBucket = this.config.get('S3_RESIZED_BUCKET', 'mini-jira-resized-images-2');
        this.s3 = new client_s3_1.S3Client({ region });
        this.cloudwatch = new client_cloudwatch_1.CloudWatchClient({ region });
    }
    async create(dto, user) {
        const now = new Date().toISOString();
        const task = {
            taskID: (0, uuid_1.v4)(),
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
        await this.dynamo.send(new lib_dynamodb_2.PutCommand({ TableName: this.tableName, Item: task }));
        await this.publishMetric('TaskCreated', 1, task.teamID);
        if (task.assigneeID) {
            await this.publishAssignment(task, user);
        }
        return task;
    }
    async findAll(user) {
        if (user.role === 'employee') {
            const byId = new Map();
            const assigned = await this.findByAssignee(user.userId);
            for (const item of assigned) {
                const id = item.taskID ?? item.taskId;
                if (id)
                    byId.set(id, item);
            }
            if (user.teamId) {
                try {
                    const teamResult = await this.dynamo.send(new lib_dynamodb_2.QueryCommand({
                        TableName: this.tableName,
                        IndexName: 'teamID-index',
                        KeyConditionExpression: 'teamID = :teamID',
                        ExpressionAttributeValues: { ':teamID': user.teamId },
                    }));
                    for (const item of teamResult.Items || []) {
                        const id = item.taskID ?? item.taskId;
                        if (id)
                            byId.set(id, item);
                    }
                }
                catch {
                }
            }
            if (byId.size > 0) {
                return Array.from(byId.values());
            }
            const result = await this.dynamo.send(new lib_dynamodb_2.ScanCommand({ TableName: this.tableName }));
            return (result.Items || []).filter((item) => {
                const assignee = item.assigneeID ??
                    item.assigneeId;
                const team = item.teamID ??
                    item.teamId;
                return (assignee === user.userId ||
                    (user.teamId && team === user.teamId) ||
                    !user.teamId);
            });
        }
        const result = await this.dynamo.send(new lib_dynamodb_2.ScanCommand({ TableName: this.tableName }));
        return result.Items || [];
    }
    async findOne(taskId, user) {
        const item = await (0, dynamodb_helpers_1.getItemByIdVariants)(this.dynamo, this.tableName, taskId, [
            'taskID',
            'taskId',
        ]);
        if (!item)
            throw new common_1.NotFoundException(`Task ${taskId} not found`);
        if (user && user.role === 'employee') {
            const itemTeam = item.teamID ?? item.teamId;
            const assignee = item.assigneeID ??
                item.assigneeId;
            const isAssignee = assignee === user.userId;
            if (user.teamId &&
                itemTeam &&
                itemTeam !== user.teamId &&
                !isAssignee) {
                throw new common_1.ForbiddenException('You are not authorized to access this task');
            }
        }
        return item;
    }
    async findByProject(projectId, user) {
        const result = await this.dynamo.send(new lib_dynamodb_2.ScanCommand({
            TableName: this.tableName,
            FilterExpression: 'projectID = :pid',
            ExpressionAttributeValues: { ':pid': projectId },
        }));
        let items = result.Items || [];
        if (user.role === 'employee' && user.teamId) {
            items = items.filter((i) => i.teamID === user.teamId);
        }
        return items;
    }
    async findByAssignee(assigneeId) {
        const result = await this.dynamo.send(new lib_dynamodb_2.QueryCommand({
            TableName: this.tableName,
            IndexName: 'assigneeID-index',
            KeyConditionExpression: 'assigneeID = :aid',
            ExpressionAttributeValues: { ':aid': assigneeId },
        }));
        return result.Items || [];
    }
    async update(taskId, dto, user) {
        const existing = await this.findOne(taskId);
        if (user.role === 'employee' && existing.assigneeID !== user.userId) {
            throw new common_1.ForbiddenException('You can only update tasks assigned to you');
        }
        const expressionParts = [];
        const names = {};
        const values = {};
        const fields = [
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
        if (expressionParts.length === 0)
            return existing;
        expressionParts.push('#ua = :ua');
        names['#ua'] = 'updatedAt';
        values[':ua'] = new Date().toISOString();
        const result = await this.dynamo.send(new lib_dynamodb_2.UpdateCommand({
            TableName: this.tableName,
            Key: (0, dynamodb_helpers_1.buildPrimaryKey)(taskId, ['taskID', 'taskId'], existing),
            UpdateExpression: `SET ${expressionParts.join(', ')}`,
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values,
            ReturnValues: 'ALL_NEW',
        }));
        const updated = result.Attributes;
        if (dto.status && dto.status !== existing.status) {
            await this.writeAuditLog(taskId, user.userId, existing.status, dto.status);
            if (dto.status === 'Done') {
                await this.publishMetric('TaskClosed', 1, updated.teamID);
                const createdAt = new Date(existing.createdAt).getTime();
                const closedAt = Date.now();
                const hoursToClose = (closedAt - createdAt) / (1000 * 60 * 60);
                await this.publishMetric('TaskTimeToClose', hoursToClose, updated.teamID);
            }
        }
        if (dto.assigneeID && dto.assigneeID !== existing.assigneeID) {
            await this.publishAssignment(updated, user);
        }
        return updated;
    }
    async assign(taskId, assigneeId, user) {
        const existing = await this.findOne(taskId);
        const oldStatus = existing.status;
        const result = await this.dynamo.send(new lib_dynamodb_2.UpdateCommand({
            TableName: this.tableName,
            Key: (0, dynamodb_helpers_1.buildPrimaryKey)(taskId, ['taskID', 'taskId'], existing),
            UpdateExpression: 'SET assigneeID = :aid, updatedAt = :ua',
            ExpressionAttributeValues: {
                ':aid': assigneeId,
                ':ua': new Date().toISOString(),
            },
            ReturnValues: 'ALL_NEW',
        }));
        const updated = result.Attributes;
        await this.publishAssignment(updated, user);
        await this.writeAuditLog(taskId, user.userId, `unassigned`, `assigned:${assigneeId}`);
        return updated;
    }
    async remove(taskId) {
        const existing = await this.findOne(taskId);
        await this.dynamo.send(new lib_dynamodb_2.DeleteCommand({
            TableName: this.tableName,
            Key: (0, dynamodb_helpers_1.buildPrimaryKey)(taskId, ['taskID', 'taskId'], existing),
        }));
        return { deleted: true };
    }
    async getUploadUrl(taskId, contentType) {
        await this.findOne(taskId);
        const key = `tasks/${taskId}/${(0, uuid_1.v4)()}`;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: this.originalsBucket,
            Key: key,
            ...(contentType ? { ContentType: contentType } : {}),
        });
        const url = await (0, s3_request_presigner_1.getSignedUrl)(this.s3, command, { expiresIn: 300 });
        return { uploadUrl: url, imageKey: key, contentType: contentType ?? null };
    }
    async uploadImageData(taskId, imageBase64, contentType) {
        await this.findOne(taskId);
        const base64Data = imageBase64.replace(/^data:image\/[a-z0-9+.-]+;base64,/i, '').trim();
        if (!base64Data) {
            throw new common_1.BadRequestException('Invalid image data');
        }
        let buffer;
        try {
            buffer = Buffer.from(base64Data, 'base64');
        }
        catch {
            throw new common_1.BadRequestException('Invalid image data');
        }
        if (!buffer.length) {
            throw new common_1.BadRequestException('Image file is empty');
        }
        const mime = contentType?.trim() || 'image/jpeg';
        const ext = mime.split('/')[1]?.split('+')[0] || 'jpg';
        const key = `tasks/${taskId}/${(0, uuid_1.v4)()}.${ext}`;
        await this.s3.send(new client_s3_1.PutObjectCommand({
            Bucket: this.originalsBucket,
            Key: key,
            Body: buffer,
            ContentType: mime,
        }));
        return this.attachImage(taskId, key);
    }
    async attachImage(taskId, imageKey) {
        const existing = await this.findOne(taskId);
        const result = await this.dynamo.send(new lib_dynamodb_2.UpdateCommand({
            TableName: this.tableName,
            Key: (0, dynamodb_helpers_1.buildPrimaryKey)(taskId, ['taskID', 'taskId'], existing),
            UpdateExpression: 'SET imageKey = :ik, resizedImageKey = :rk, updatedAt = :ua',
            ExpressionAttributeValues: {
                ':ik': imageKey,
                ':rk': imageKey,
                ':ua': new Date().toISOString(),
            },
            ReturnValues: 'ALL_NEW',
        }));
        return result.Attributes;
    }
    async getImageUrl(taskId, variant = 'resized') {
        const task = await this.findOne(taskId);
        const key = variant === 'original' ? task.imageKey : task.resizedImageKey;
        if (!key)
            return { imageUrl: null };
        const bucket = variant === 'original' ? this.originalsBucket : this.resizedBucket;
        const command = new client_s3_1.GetObjectCommand({ Bucket: bucket, Key: key });
        const url = await (0, s3_request_presigner_1.getSignedUrl)(this.s3, command, { expiresIn: 3600 });
        return { imageUrl: url };
    }
    async publishAssignment(task, assigner) {
        const assigneeID = task.assigneeID ??
            task.assigneeId;
        if (!assigneeID)
            return;
        let assigneeName = '';
        let assigneeEmail = '';
        try {
            const assignee = await (0, dynamodb_helpers_1.getItemByIdVariants)(this.dynamo, this.usersTable, assigneeID, ['userID', 'userId']);
            if (assignee) {
                assigneeName = assignee.name ?? '';
                assigneeEmail = assignee.email ?? '';
            }
        }
        catch (err) {
            console.error(`Assignee lookup failed for ${assigneeID}:`, err.message);
        }
        try {
            await this.notifications.publishTaskAssignment({
                taskID: task.taskID ?? task.taskId,
                taskTitle: task.title ?? 'Untitled task',
                assigneeID,
                assigneeName,
                assigneeEmail,
                teamID: task.teamID ??
                    task.teamId,
                assignedBy: assigner.name,
            });
        }
        catch (err) {
            console.error('Failed to publish SNS assignment:', err.message);
        }
    }
    async writeAuditLog(taskId, changedBy, oldStatus, newStatus) {
        await this.dynamo.send(new lib_dynamodb_2.PutCommand({
            TableName: this.auditTable,
            Item: {
                LogID: (0, uuid_1.v4)(),
                taskID: taskId,
                changedBy,
                oldStatus,
                newStatus,
                timestamp: new Date().toISOString(),
            },
        })).catch((err) => {
            console.error('Failed to write audit log:', err.message);
        });
    }
    async publishMetric(name, value, teamId) {
        await this.cloudwatch.send(new client_cloudwatch_1.PutMetricDataCommand({
            Namespace: 'MiniJira',
            MetricData: [
                {
                    MetricName: name,
                    Dimensions: [{ Name: 'TeamId', Value: teamId || 'unknown' }],
                    Unit: name === 'TaskTimeToClose' ? 'None' : 'Count',
                    Value: value,
                },
            ],
        })).catch((err) => {
            console.error(`Failed to publish metric ${name}:`, err.message);
        });
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(dynamodb_module_1.DYNAMO_CLIENT)),
    __metadata("design:paramtypes", [lib_dynamodb_1.DynamoDBDocumentClient,
        config_1.ConfigService,
        notifications_service_1.NotificationsService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map