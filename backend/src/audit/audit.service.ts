import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DYNAMO_CLIENT } from '../dynamodb/dynamodb.module';
import { queryTaskScopedIndex, sortByIsoField } from '../dynamodb/dynamodb-helpers';

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
    const items = await queryTaskScopedIndex(this.dynamo, this.tableName, taskId);
    return sortByIsoField(items, 'timestamp');
  }
}
