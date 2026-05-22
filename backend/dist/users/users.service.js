"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const lib_dynamodb_2 = require("@aws-sdk/lib-dynamodb");
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const dynamodb_module_1 = require("../dynamodb/dynamodb.module");
const dynamodb_helpers_1 = require("../dynamodb/dynamodb-helpers");
let UsersService = class UsersService {
    constructor(dynamo, config) {
        this.dynamo = dynamo;
        this.config = config;
        this.tableName = this.config.get('DYNAMODB_USERS_TABLE', 'mini-jira-users');
        this.userPoolId = this.config.get('COGNITO_USER_POOL_ID', '');
        this.cognitoClient = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({
            region: this.config.get('AWS_REGION', 'us-east-1'),
        });
    }
    async create(dto) {
        if (!this.userPoolId) {
            throw new common_1.BadRequestException('COGNITO_USER_POOL_ID is not configured');
        }
        const providedPassword = dto.password?.trim();
        if (!providedPassword) {
            throw new common_1.BadRequestException('Password is required when creating a user');
        }
        try {
            return await this.createCognitoAndDynamoUser(dto, providedPassword);
        }
        catch (error) {
            const err = error;
            if (err.name === 'UsernameExistsException') {
                return this.syncExistingCognitoUser(dto, providedPassword);
            }
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException(this.formatCognitoError(error));
        }
    }
    async createCognitoAndDynamoUser(dto, password) {
        await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminCreateUserCommand({
            UserPoolId: this.userPoolId,
            Username: dto.email,
            TemporaryPassword: password,
            UserAttributes: [
                { Name: 'email', Value: dto.email },
                { Name: 'email_verified', Value: 'true' },
                { Name: 'name', Value: dto.name },
                { Name: 'custom:role', Value: dto.role },
                { Name: 'custom:teamId', Value: dto.teamID || '' },
            ],
            MessageAction: 'SUPPRESS',
        }));
        await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminSetUserPasswordCommand({
            UserPoolId: this.userPoolId,
            Username: dto.email,
            Password: password,
            Permanent: true,
        }));
        const userID = await this.getCognitoSub(dto.email);
        return this.saveUserRecord(userID, dto);
    }
    async syncExistingCognitoUser(dto, password) {
        await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminSetUserPasswordCommand({
            UserPoolId: this.userPoolId,
            Username: dto.email,
            Password: password,
            Permanent: true,
        }));
        await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminUpdateUserAttributesCommand({
            UserPoolId: this.userPoolId,
            Username: dto.email,
            UserAttributes: [
                { Name: 'name', Value: dto.name },
                { Name: 'custom:role', Value: dto.role },
                { Name: 'custom:teamId', Value: dto.teamID || '' },
            ],
        }));
        const userID = await this.getCognitoSub(dto.email);
        return this.saveUserRecord(userID, dto);
    }
    async getCognitoSub(email) {
        const cognitoUser = await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminGetUserCommand({
            UserPoolId: this.userPoolId,
            Username: email,
        }));
        return (cognitoUser.UserAttributes?.find((attr) => attr.Name === 'sub')?.Value ??
            cognitoUser.Username ??
            email);
    }
    async saveUserRecord(userID, dto) {
        const user = {
            userId: userID,
            userID,
            email: dto.email,
            name: dto.name,
            role: dto.role,
            teamID: dto.teamID || '',
            teamId: dto.teamID || '',
            createdAt: new Date().toISOString(),
        };
        try {
            await this.dynamo.send(new lib_dynamodb_2.PutCommand({ TableName: this.tableName, Item: user }));
        }
        catch (error) {
            const message = error?.message ?? 'Failed to save user in database';
            throw new common_1.InternalServerErrorException(message);
        }
        return user;
    }
    formatCognitoError(error) {
        const err = error;
        switch (err.name) {
            case 'InvalidPasswordException':
                return 'Password does not meet Cognito policy (min 8 chars, upper, lower, number, symbol)';
            case 'InvalidParameterException':
                return err.message || 'Invalid user parameters';
            default:
                return err.message || 'Failed to create user';
        }
    }
    async findAll() {
        const result = await this.dynamo.send(new lib_dynamodb_2.ScanCommand({ TableName: this.tableName }));
        return result.Items || [];
    }
    async findOne(userId) {
        const item = await (0, dynamodb_helpers_1.getItemByIdVariants)(this.dynamo, this.tableName, userId, [
            'userID',
            'userId',
        ]);
        if (!item)
            throw new common_1.NotFoundException(`User ${userId} not found`);
        return item;
    }
    async update(userId, dto) {
        const existing = await this.findOne(userId);
        const expressionParts = [];
        const names = {};
        const values = {};
        if (dto.name !== undefined) {
            expressionParts.push('#n = :n');
            names['#n'] = 'name';
            values[':n'] = dto.name;
        }
        if (dto.role !== undefined) {
            expressionParts.push('#r = :r');
            names['#r'] = 'role';
            values[':r'] = dto.role;
        }
        if (dto.teamID !== undefined) {
            expressionParts.push('#t = :t');
            names['#t'] = 'teamID';
            values[':t'] = dto.teamID;
        }
        if (expressionParts.length === 0)
            return this.findOne(userId);
        expressionParts.push('#u = :u');
        names['#u'] = 'updatedAt';
        values[':u'] = new Date().toISOString();
        const result = await this.dynamo.send(new lib_dynamodb_2.UpdateCommand({
            TableName: this.tableName,
            Key: (0, dynamodb_helpers_1.buildPrimaryKey)(userId, ['userID', 'userId'], existing),
            UpdateExpression: `SET ${expressionParts.join(', ')}`,
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values,
            ReturnValues: 'ALL_NEW',
        }));
        const cognitoAttrs = [];
        if (dto.role !== undefined)
            cognitoAttrs.push({ Name: 'custom:role', Value: dto.role });
        if (dto.teamID !== undefined)
            cognitoAttrs.push({ Name: 'custom:teamId', Value: dto.teamID });
        if (dto.name !== undefined)
            cognitoAttrs.push({ Name: 'name', Value: dto.name });
        if (cognitoAttrs.length > 0) {
            const user = result.Attributes;
            await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminUpdateUserAttributesCommand({
                UserPoolId: this.userPoolId,
                Username: user.email,
                UserAttributes: cognitoAttrs,
            })).catch((err) => {
                console.warn('Failed to update Cognito attributes:', err.message);
            });
        }
        return result.Attributes;
    }
    async remove(userId) {
        const existing = await this.findOne(userId);
        await this.dynamo.send(new lib_dynamodb_2.DeleteCommand({
            TableName: this.tableName,
            Key: (0, dynamodb_helpers_1.buildPrimaryKey)(userId, ['userID', 'userId'], existing),
        }));
        return { deleted: true };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(dynamodb_module_1.DYNAMO_CLIENT)),
    __metadata("design:paramtypes", [lib_dynamodb_1.DynamoDBDocumentClient,
        config_1.ConfigService])
], UsersService);
//# sourceMappingURL=users.service.js.map