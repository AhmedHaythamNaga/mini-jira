import { ConfigService } from '@nestjs/config';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersService {
    private readonly dynamo;
    private readonly config;
    private readonly tableName;
    private readonly cognitoClient;
    private readonly userPoolId;
    constructor(dynamo: DynamoDBDocumentClient, config: ConfigService);
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
    private normalizeEmail;
    private ensureLoginReady;
    private createCognitoAndDynamoUser;
    private syncExistingCognitoUser;
    private getCognitoSub;
    private saveUserRecord;
    private formatCognitoError;
    findAll(): Promise<Record<string, any>[]>;
    findOne(userId: string): Promise<Record<string, any>>;
    update(userId: string, dto: UpdateUserDto): Promise<Record<string, any> | undefined>;
    remove(userId: string): Promise<{
        deleted: boolean;
    }>;
}
