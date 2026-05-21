import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AuthUser } from '../auth/decorators/current-user.decorator';
export declare class ProjectsController {
    private readonly projectsService;
    constructor(projectsService: ProjectsService);
    create(dto: CreateProjectDto, user: AuthUser): Promise<{
        projectId: string;
        name: string;
        description: string;
        createdBy: string;
        createdAt: string;
    }>;
    findAll(): Promise<Record<string, any>[]>;
    findOne(id: string): Promise<Record<string, any>>;
    update(id: string, dto: UpdateProjectDto): Promise<Record<string, any> | undefined>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
}
