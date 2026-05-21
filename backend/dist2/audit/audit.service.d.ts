import { ConfigService } from '@nestjs/config';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
export declare class AuditService {
    private readonly dynamo;
    private readonly config;
    private readonly tableName;
    constructor(dynamo: DynamoDBDocumentClient, config: ConfigService);
    findByTask(taskId: string): Promise<Record<string, any>[]>;
}
