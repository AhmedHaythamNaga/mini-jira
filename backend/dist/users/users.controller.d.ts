import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(dto: CreateUserDto): Promise<{
        userID: string;
        email: string;
        name: string;
        role: string;
        teamID: string;
        createdAt: string;
    }>;
    findAll(): Promise<Record<string, any>[]>;
    findOne(id: string): Promise<Record<string, any>>;
    update(id: string, dto: UpdateUserDto): Promise<Record<string, any> | undefined>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
}
