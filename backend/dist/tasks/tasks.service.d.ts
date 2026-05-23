import { ConfigService } from '@nestjs/config';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AuthUser } from '../auth/decorators/current-user.decorator';
export declare class TasksService {
    private readonly dynamo;
    private readonly config;
    private readonly notifications;
    private readonly tableName;
    private readonly usersTable;
    private readonly teamsTable;
    private readonly auditTable;
    private readonly originalsBucket;
    private readonly resizedBucket;
    private readonly s3;
    private readonly cloudwatch;
    constructor(dynamo: DynamoDBDocumentClient, config: ConfigService, notifications: NotificationsService);
    create(dto: CreateTaskDto, user: AuthUser): Promise<{
        taskID: string;
        title: string;
        description: string;
        status: string;
        priority: string;
        deadline: string;
        assigneeID: string;
        teamID: string;
        projectID: string;
        imageKey: string;
        resizedImageKey: string;
        createdBy: string;
        createdAt: string;
        updatedAt: string;
    }>;
    findAll(user: AuthUser): Promise<Record<string, any>[]>;
    findOne(taskId: string, user?: AuthUser): Promise<Record<string, any>>;
    findByProject(projectId: string, user: AuthUser): Promise<Record<string, any>[]>;
    findByAssignee(assigneeId: string): Promise<Record<string, any>[]>;
    update(taskId: string, dto: UpdateTaskDto, user: AuthUser): Promise<Record<string, any>>;
    assign(taskId: string, assigneeId: string, user: AuthUser): Promise<Record<string, any>>;
    remove(taskId: string): Promise<{
        deleted: boolean;
    }>;
    getUploadUrl(taskId: string, contentType?: string): Promise<{
        uploadUrl: string;
        imageKey: string;
        contentType: string | null;
    }>;
    uploadImageData(taskId: string, imageBase64: string, contentType?: string): Promise<Record<string, any> | undefined>;
    attachImage(taskId: string, imageKey: string): Promise<Record<string, any> | undefined>;
    getImageUrl(taskId: string, variant?: 'original' | 'resized'): Promise<{
        imageUrl: null;
    } | {
        imageUrl: string;
    }>;
    private publishAssignment;
    private writeAuditLog;
    private publishMetric;
}
