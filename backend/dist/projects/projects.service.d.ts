import { ConfigService } from '@nestjs/config';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AuthUser } from '../auth/decorators/current-user.decorator';
export declare class ProjectsService {
    private readonly dynamo;
    private readonly config;
    private readonly tableName;
    constructor(dynamo: DynamoDBDocumentClient, config: ConfigService);
    create(dto: CreateProjectDto, user: AuthUser): Promise<{
        projectID: string;
        name: string;
        description: string;
        createdBy: string;
        createdAt: string;
    }>;
    findAll(): Promise<Record<string, any>[]>;
    findOne(projectId: string): Promise<Record<string, any>>;
    update(projectId: string, dto: UpdateProjectDto): Promise<Record<string, any> | undefined>;
    remove(projectId: string): Promise<{
        deleted: boolean;
    }>;
}
