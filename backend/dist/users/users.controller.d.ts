import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthUser } from '../auth/decorators/current-user.decorator';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(dto: CreateUserDto): Promise<{
        userId: string;
        userID: string;
        email: string;
        name: string;
        role: string;
        teamID: string;
        teamId: string;
        createdAt: string;
    }>;
    findAll(): Promise<Record<string, any>[]>;
    getMe(user: AuthUser): Promise<Record<string, any>>;
    findOne(id: string): Promise<Record<string, any>>;
    update(id: string, dto: UpdateUserDto): Promise<Record<string, any> | undefined>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
}
