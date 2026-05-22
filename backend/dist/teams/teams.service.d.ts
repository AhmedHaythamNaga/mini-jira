import { ConfigService } from '@nestjs/config';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
export declare class TeamsService {
    private readonly dynamo;
    private readonly config;
    private readonly tableName;
    constructor(dynamo: DynamoDBDocumentClient, config: ConfigService);
    create(dto: CreateTeamDto): Promise<{
        teamID: string;
        teamId: string;
        name: string;
        createdAt: string;
    }>;
    findAll(): Promise<Record<string, any>[]>;
    findOne(teamId: string): Promise<Record<string, any>>;
    update(teamId: string, dto: UpdateTeamDto): Promise<Record<string, any> | undefined>;
    remove(teamId: string): Promise<{
        deleted: boolean;
    }>;
}
