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
import { v4 as uuidv4 } from 'uuid';
import { DYNAMO_CLIENT } from '../dynamodb/dynamodb.module';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AuthUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class ProjectsService {
  private readonly tableName: string;

  constructor(
    @Inject(DYNAMO_CLIENT) private readonly dynamo: DynamoDBDocumentClient,
    private readonly config: ConfigService,
  ) {
    this.tableName = this.config.get<string>('DYNAMODB_PROJECTS_TABLE', 'mini-jira-projects');
  }

  async create(dto: CreateProjectDto, user: AuthUser) {
    const project = {
      projectID: uuidv4(),
      name: dto.name,
      description: dto.description || '',
      createdBy: user.userId,
      createdAt: new Date().toISOString(),
    };
    await this.dynamo.send(
      new PutCommand({ TableName: this.tableName, Item: project }),
    );
    return project;
  }

  async findAll() {
    const result = await this.dynamo.send(
      new ScanCommand({ TableName: this.tableName }),
    );
    return result.Items || [];
  }

  async findOne(projectId: string) {
    const result = await this.dynamo.send(
      new GetCommand({ TableName: this.tableName, Key: { projectID: projectId } }),
    );
    if (!result.Item) throw new NotFoundException(`Project ${projectId} not found`);
    return result.Item;
  }

  async update(projectId: string, dto: UpdateProjectDto) {
    await this.findOne(projectId);

    const expressionParts: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, any> = {};

    if (dto.name !== undefined) {
      expressionParts.push('#n = :n');
      names['#n'] = 'name';
      values[':n'] = dto.name;
    }
    if (dto.description !== undefined) {
      expressionParts.push('#d = :d');
      names['#d'] = 'description';
      values[':d'] = dto.description;
    }

    if (expressionParts.length === 0) return this.findOne(projectId);

    expressionParts.push('#u = :u');
    names['#u'] = 'updatedAt';
    values[':u'] = new Date().toISOString();

    const result = await this.dynamo.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { projectID: projectId },
        UpdateExpression: `SET ${expressionParts.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      }),
    );
    return result.Attributes;
  }

  async remove(projectId: string) {
    await this.findOne(projectId);
    await this.dynamo.send(
      new DeleteCommand({ TableName: this.tableName, Key: { projectID: projectId } }),
    );
    return { deleted: true };
  }
}
