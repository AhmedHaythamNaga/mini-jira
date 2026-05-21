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
        const cognitoResult = await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminCreateUserCommand({
            UserPoolId: this.userPoolId,
            Username: dto.email,
            UserAttributes: [
                { Name: 'email', Value: dto.email },
                { Name: 'email_verified', Value: 'true' },
                { Name: 'name', Value: dto.name },
                { Name: 'custom:role', Value: dto.role },
                { Name: 'custom:teamId', Value: dto.teamId || '' },
            ],
            MessageAction: 'SUPPRESS',
        }));
        const userId = cognitoResult.User?.Username || dto.email;
        await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminSetUserPasswordCommand({
            UserPoolId: this.userPoolId,
            Username: dto.email,
            Password: dto.password,
            Permanent: true,
        }));
        const user = {
            userId,
            email: dto.email,
            name: dto.name,
            role: dto.role,
            teamId: dto.teamId || '',
            createdAt: new Date().toISOString(),
        };
        await this.dynamo.send(new lib_dynamodb_2.PutCommand({ TableName: this.tableName, Item: user }));
        return user;
    }
    async findAll() {
        const result = await this.dynamo.send(new lib_dynamodb_2.ScanCommand({ TableName: this.tableName }));
        return result.Items || [];
    }
    async findOne(userId) {
        const result = await this.dynamo.send(new lib_dynamodb_2.GetCommand({ TableName: this.tableName, Key: { userId } }));
        if (!result.Item)
            throw new common_1.NotFoundException(`User ${userId} not found`);
        return result.Item;
    }
    async update(userId, dto) {
        await this.findOne(userId);
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
        if (dto.teamId !== undefined) {
            expressionParts.push('#t = :t');
            names['#t'] = 'teamId';
            values[':t'] = dto.teamId;
        }
        if (expressionParts.length === 0)
            return this.findOne(userId);
        expressionParts.push('#u = :u');
        names['#u'] = 'updatedAt';
        values[':u'] = new Date().toISOString();
        const result = await this.dynamo.send(new lib_dynamodb_2.UpdateCommand({
            TableName: this.tableName,
            Key: { userId },
            UpdateExpression: `SET ${expressionParts.join(', ')}`,
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values,
            ReturnValues: 'ALL_NEW',
        }));
        const cognitoAttrs = [];
        if (dto.role !== undefined)
            cognitoAttrs.push({ Name: 'custom:role', Value: dto.role });
        if (dto.teamId !== undefined)
            cognitoAttrs.push({ Name: 'custom:teamId', Value: dto.teamId });
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
        await this.findOne(userId);
        await this.dynamo.send(new lib_dynamodb_2.DeleteCommand({ TableName: this.tableName, Key: { userId } }));
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