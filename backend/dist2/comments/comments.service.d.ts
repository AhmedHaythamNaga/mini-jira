import { ConfigService } from '@nestjs/config';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { CreateCommentDto } from './dto/create-comment.dto';
import { AuthUser } from '../auth/decorators/current-user.decorator';
export declare class CommentsService {
    private readonly dynamo;
    private readonly config;
    private readonly tableName;
    constructor(dynamo: DynamoDBDocumentClient, config: ConfigService);
    create(taskId: string, dto: CreateCommentDto, user: AuthUser): Promise<{
        commentId: string;
        taskId: string;
        authorId: string;
        authorName: string;
        content: string;
        createdAt: string;
    }>;
    findByTask(taskId: string): Promise<Record<string, any>[]>;
}
