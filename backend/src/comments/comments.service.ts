import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { DYNAMO_CLIENT } from '../dynamodb/dynamodb.module';
import { CreateCommentDto } from './dto/create-comment.dto';
import { AuthUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class CommentsService {
  private readonly tableName: string;

  constructor(
    @Inject(DYNAMO_CLIENT) private readonly dynamo: DynamoDBDocumentClient,
    private readonly config: ConfigService,
  ) {
    this.tableName = this.config.get<string>('DYNAMODB_COMMENTS_TABLE', 'mini-jira-comments');
  }

  async create(taskId: string, dto: CreateCommentDto, user: AuthUser) {
    const comment = {
      commentId: uuidv4(),
      taskId,
      authorId: user.userId,
      authorName: user.name,
      content: dto.content,
      createdAt: new Date().toISOString(),
    };

    await this.dynamo.send(
      new PutCommand({ TableName: this.tableName, Item: comment }),
    );
    return comment;
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
    // Sort by createdAt ascending
    const items = result.Items || [];
    return items.sort((a, b) =>
      (a.createdAt as string).localeCompare(b.createdAt as string),
    );
  }
}
