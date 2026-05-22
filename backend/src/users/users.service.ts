import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  PutCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  AdminConfirmSignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { DYNAMO_CLIENT } from '../dynamodb/dynamodb.module';
import { buildPrimaryKey, getItemByIdVariants } from '../dynamodb/dynamodb-helpers';
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
    if (!this.userPoolId) {
      throw new BadRequestException('COGNITO_USER_POOL_ID is not configured');
    }

    const providedPassword = dto.password?.trim();
    if (!providedPassword) {
      throw new BadRequestException('Password is required when creating a user');
    }

    try {
      return await this.createCognitoAndDynamoUser(dto, providedPassword);
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name === 'UsernameExistsException') {
        return this.syncExistingCognitoUser(dto, providedPassword);
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(this.formatCognitoError(error));
    }
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private async ensureLoginReady(email: string, password: string) {
    await this.cognitoClient.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        Password: password,
        Permanent: true,
      }),
    );

    await this.cognitoClient
      .send(
        new AdminConfirmSignUpCommand({
          UserPoolId: this.userPoolId,
          Username: email,
        }),
      )
      .catch(() => {
        // Already confirmed.
      });
  }

  private async createCognitoAndDynamoUser(dto: CreateUserDto, password: string) {
    const email = this.normalizeEmail(dto.email);

    await this.cognitoClient.send(
      new AdminCreateUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        TemporaryPassword: password,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'name', Value: dto.name },
          { Name: 'custom:role', Value: dto.role },
          { Name: 'custom:teamId', Value: dto.teamID || '' },
        ],
        MessageAction: 'SUPPRESS',
      }),
    );

    await this.ensureLoginReady(email, password);

    const userID = await this.getCognitoSub(email);
    return this.saveUserRecord(userID, { ...dto, email });
  }

  private async syncExistingCognitoUser(dto: CreateUserDto, password: string) {
    const email = this.normalizeEmail(dto.email);
    await this.ensureLoginReady(email, password);

    await this.cognitoClient.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        UserAttributes: [
          { Name: 'name', Value: dto.name },
          { Name: 'custom:role', Value: dto.role },
          { Name: 'custom:teamId', Value: dto.teamID || '' },
        ],
      }),
    );

    const userID = await this.getCognitoSub(email);
    return this.saveUserRecord(userID, { ...dto, email });
  }

  private async getCognitoSub(email: string) {
    const cognitoUser = await this.cognitoClient.send(
      new AdminGetUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
      }),
    );
    return (
      cognitoUser.UserAttributes?.find((attr) => attr.Name === 'sub')?.Value ??
      cognitoUser.Username ??
      email
    );
  }

  private async saveUserRecord(userID: string, dto: CreateUserDto) {
    const email = this.normalizeEmail(dto.email);
    const user = {
      userId: userID,
      userID,
      email,
      name: dto.name,
      role: dto.role,
      teamID: dto.teamID || '',
      teamId: dto.teamID || '',
      createdAt: new Date().toISOString(),
    };

    try {
      await this.dynamo.send(
        new PutCommand({ TableName: this.tableName, Item: user }),
      );
    } catch (error: unknown) {
      const message = (error as Error)?.message ?? 'Failed to save user in database';
      throw new InternalServerErrorException(message);
    }

    return user;
  }

  private formatCognitoError(error: unknown) {
    const err = error as { name?: string; message?: string };
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
    const result = await this.dynamo.send(
      new ScanCommand({ TableName: this.tableName }),
    );
    return result.Items || [];
  }

  async findOne(userId: string) {
    const item = await getItemByIdVariants(this.dynamo, this.tableName, userId, [
      'userID',
      'userId',
    ]);
    if (!item) throw new NotFoundException(`User ${userId} not found`);
    return item;
  }

  async update(userId: string, dto: UpdateUserDto) {
    const existing = await this.findOne(userId);

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
    if (dto.teamID !== undefined) {
      expressionParts.push('#t = :t');
      names['#t'] = 'teamID';
      values[':t'] = dto.teamID;
    }

    if (expressionParts.length === 0) return this.findOne(userId);

    expressionParts.push('#u = :u');
    names['#u'] = 'updatedAt';
    values[':u'] = new Date().toISOString();

    const result = await this.dynamo.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: buildPrimaryKey(userId, ['userID', 'userId'], existing),
        UpdateExpression: `SET ${expressionParts.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      }),
    );

    const cognitoAttrs: { Name: string; Value: string }[] = [];
    if (dto.role !== undefined) cognitoAttrs.push({ Name: 'custom:role', Value: dto.role });
    if (dto.teamID !== undefined) cognitoAttrs.push({ Name: 'custom:teamId', Value: dto.teamID });
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
    const existing = await this.findOne(userId);
    await this.dynamo.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: buildPrimaryKey(userId, ['userID', 'userId'], existing),
      }),
    );
    return { deleted: true };
  }
}
