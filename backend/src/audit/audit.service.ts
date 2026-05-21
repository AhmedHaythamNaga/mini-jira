import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { DYNAMO_CLIENT } from '../dynamodb/dynamodb.module';

@Injectable()
export class AuditService {
  private readonly tableName: string;

  constructor(
    @Inject(DYNAMO_CLIENT) private readonly dynamo: DynamoDBDocumentClient,
    private readonly config: ConfigService,
  ) {
    this.tableName = this.config.get<string>('DYNAMODB_AUDIT_TABLE', 'mini-jira-audit');
  }

  async findByTask(taskId: string) {
    const result = await this.dynamo.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'taskId-index',
        KeyConditionExpression: 'taskId = :taskId',
        ExpressionAttributeValues: { ':taskId': taskId },
      }),
    );
    const items = result.Items || [];
    return items.sort((a, b) =>
      (a.timestamp as string).localeCompare(b.timestamp as string),
    );
  }
}
