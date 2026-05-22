import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  PutCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { DYNAMO_CLIENT } from '../dynamodb/dynamodb.module';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly tableName: string;
  private readonly cognitoClient: CognitoIdentityProviderClient;
  private readonly userPoolId: string;

  constructor(
    @Inject(DYNAMO_CLIENT) private readonly dynamo: DynamoDBDocumentClient,
    private readonly config: ConfigService,
  ) {
    this.tableName = this.config.get<string>('DYNAMODB_USERS_TABLE', 'mini-jira-users');
    this.userPoolId = this.config.get<string>('COGNITO_USER_POOL_ID', '');
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: this.config.get<string>('AWS_REGION', 'us-east-1'),
    });
  }

  async create(dto: CreateUserDto) {
    // 1. Create user in Cognito
    const cognitoResult = await this.cognitoClient.send(
      new AdminCreateUserCommand({
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
      }),
    );

    const userId = cognitoResult.User?.Username || dto.email;

    // Set permanent password
    await this.cognitoClient.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: this.userPoolId,
        Username: dto.email,
        Password: dto.password,
        Permanent: true,
      }),
    );

    // 2. Save user in DynamoDB
    const user = {
      userID: userId,
      email: dto.email,
      name: dto.name,
      role: dto.role,
      teamId: dto.teamId || '',
      createdAt: new Date().toISOString(),
    };

    await this.dynamo.send(
      new PutCommand({ TableName: this.tableName, Item: user }),
    );

    return user;
  }

  async findAll() {
    const result = await this.dynamo.send(
      new ScanCommand({ TableName: this.tableName }),
    );
    return result.Items || [];
  }

  async findOne(userId: string) {
    const result = await this.dynamo.send(
      new GetCommand({ TableName: this.tableName, Key: { userID: userId } }),
    );
    if (!result.Item) throw new NotFoundException(`User ${userId} not found`);
    return result.Item;
  }

  async update(userId: string, dto: UpdateUserDto) {
    await this.findOne(userId); // ensure exists

    const expressionParts: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, any> = {};

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

    if (expressionParts.length === 0) return this.findOne(userId);

    expressionParts.push('#u = :u');
    names['#u'] = 'updatedAt';
    values[':u'] = new Date().toISOString();

    const result = await this.dynamo.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { userID: userId },
        UpdateExpression: `SET ${expressionParts.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      }),
    );

    // Also update Cognito custom attributes if role or teamId changed
    const cognitoAttrs: { Name: string; Value: string }[] = [];
    if (dto.role !== undefined) cognitoAttrs.push({ Name: 'custom:role', Value: dto.role });
    if (dto.teamId !== undefined) cognitoAttrs.push({ Name: 'custom:teamId', Value: dto.teamId });
    if (dto.name !== undefined) cognitoAttrs.push({ Name: 'name', Value: dto.name });

    if (cognitoAttrs.length > 0) {
      const user = result.Attributes!;
      await this.cognitoClient.send(
        new AdminUpdateUserAttributesCommand({
          UserPoolId: this.userPoolId,
          Username: user.email as string,
          UserAttributes: cognitoAttrs,
        }),
      ).catch((err) => {
        console.warn('Failed to update Cognito attributes:', err.message);
      });
    }

    return result.Attributes;
  }

  async remove(userId: string) {
    await this.findOne(userId);
    await this.dynamo.send(
      new DeleteCommand({ TableName: this.tableName, Key: { userID: userId } }),
    );
    return { deleted: true };
  }
}
