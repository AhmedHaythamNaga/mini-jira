import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { AuthUser } from '../auth/decorators/current-user.decorator';
export declare class CommentsController {
    private readonly commentsService;
    constructor(commentsService: CommentsService);
    create(taskId: string, dto: CreateCommentDto, user: AuthUser): Promise<{
        commentID: string;
        taskID: string;
        authorID: string;
        authorName: string;
        content: string;
        createdAt: string;
    }>;
    findByTask(taskId: string, user: AuthUser): Promise<Record<string, any>[]>;
}
