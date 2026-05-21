import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { AttachImageDto } from './dto/attach-image.dto';
import { AuthUser } from '../auth/decorators/current-user.decorator';
export declare class TasksController {
    private readonly tasksService;
    constructor(tasksService: TasksService);
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
    findByProject(projectId: string, user: AuthUser): Promise<Record<string, any>[]>;
    findByAssignee(assigneeId: string): Promise<Record<string, any>[]>;
    findOne(id: string): Promise<Record<string, any>>;
    update(id: string, dto: UpdateTaskDto, user: AuthUser): Promise<Record<string, any>>;
    assign(id: string, dto: AssignTaskDto, user: AuthUser): Promise<Record<string, any>>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
    getUploadUrl(id: string): Promise<{
        uploadUrl: string;
        imageKey: string;
    }>;
    attachImage(id: string, dto: AttachImageDto): Promise<Record<string, any> | undefined>;
    getImageUrl(id: string, variant?: 'original' | 'resized'): Promise<{
        imageUrl: null;
    } | {
        imageUrl: string;
    }>;
}
