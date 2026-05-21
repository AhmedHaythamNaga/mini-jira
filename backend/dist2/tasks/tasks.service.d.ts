import { ConfigService } from '@nestjs/config';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AuthUser } from '../auth/decorators/current-user.decorator';
export declare class TasksService {
    private readonly dynamo;
    private readonly config;
    private readonly tableName;
    private readonly usersTable;
    private readonly auditTable;
    private readonly originalsBucket;
    private readonly resizedBucket;
    private readonly snsTopicArn;
    private readonly s3;
    private readonly cloudwatch;
    private readonly sns;
    constructor(dynamo: DynamoDBDocumentClient, config: ConfigService);
    create(dto: CreateTaskDto, user: AuthUser): Promise<{
        taskId: string;
        title: string;
        description: string;
        status: string;
        priority: string;
        deadline: string;
        assigneeId: string;
        teamId: string;
        projectId: string;
        imageKey: string;
        resizedImageKey: string;
        createdBy: string;
        createdAt: string;
        updatedAt: string;
    }>;
    findAll(user: AuthUser): Promise<Record<string, any>[]>;
    findOne(taskId: string): Promise<Record<string, any>>;
    findByProject(projectId: string, user: AuthUser): Promise<Record<string, any>[]>;
    findByAssignee(assigneeId: string): Promise<Record<string, any>[]>;
    update(taskId: string, dto: UpdateTaskDto, user: AuthUser): Promise<Record<string, any>>;
    assign(taskId: string, assigneeId: string, user: AuthUser): Promise<Record<string, any>>;
    remove(taskId: string): Promise<{
        deleted: boolean;
    }>;
    getUploadUrl(taskId: string): Promise<{
        uploadUrl: string;
        imageKey: string;
    }>;
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
