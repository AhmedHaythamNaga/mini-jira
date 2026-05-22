import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
export declare class TeamsController {
    private readonly teamsService;
    constructor(teamsService: TeamsService);
    create(dto: CreateTeamDto): Promise<{
        teamID: string;
        teamId: string;
        name: string;
        createdAt: string;
    }>;
    findAll(): Promise<Record<string, any>[]>;
    findOne(id: string): Promise<Record<string, any>>;
    update(id: string, dto: UpdateTeamDto): Promise<Record<string, any> | undefined>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
}
