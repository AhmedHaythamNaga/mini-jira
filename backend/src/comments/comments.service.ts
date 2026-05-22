import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { DYNAMO_CLIENT } from '../dynamodb/dynamodb.module';
import {
  getItemByIdVariants,
  queryTaskScopedIndex,
  sortByIsoField,
} from '../dynamodb/dynamodb-helpers';
import { CreateCommentDto } from './dto/create-comment.dto';
import { AuthUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class CommentsService {
  private readonly tableName: string;
  private readonly tasksTable: string;

  constructor(
    @Inject(DYNAMO_CLIENT) private readonly dynamo: DynamoDBDocumentClient,
    private readonly config: ConfigService,
  ) {
    this.tableName = this.config.get<string>('DYNAMODB_COMMENTS_TABLE', 'mini-jira-comments');
    this.tasksTable = this.config.get<string>('DYNAMODB_TASKS_TABLE', 'mini-jira-tasks');
  }

  async create(taskId: string, dto: CreateCommentDto, user: AuthUser) {
    await this.getTaskOrThrow(taskId);

    const commentId = uuidv4();
    const comment = {
      commentID: commentId,
      commentId,
      taskID: taskId,
      taskId,
      authorID: user.userId,
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
    await this.getTaskOrThrow(taskId);
    const items = await queryTaskScopedIndex(this.dynamo, this.tableName, taskId);
    return sortByIsoField(items, 'createdAt');
  }

  private async getTaskOrThrow(taskId: string) {
    const task = await getItemByIdVariants(this.dynamo, this.tasksTable, taskId, [
      'taskID',
      'taskId',
    ]);
    if (!task) throw new NotFoundException(`Task ${taskId} not found`);
    return task;
  }

}
