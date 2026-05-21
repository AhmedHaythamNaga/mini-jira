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
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamsService {
  private readonly tableName: string;

  constructor(
    @Inject(DYNAMO_CLIENT) private readonly dynamo: DynamoDBDocumentClient,
    private readonly config: ConfigService,
  ) {
    this.tableName = this.config.get<string>('DYNAMODB_TEAMS_TABLE', 'mini-jira-teams');
  }

  async create(dto: CreateTeamDto) {
    const team = {
      teamId: uuidv4(),
      name: dto.name,
      createdAt: new Date().toISOString(),
    };
    await this.dynamo.send(
      new PutCommand({ TableName: this.tableName, Item: team }),
    );
    return team;
  }

  async findAll() {
    const result = await this.dynamo.send(
      new ScanCommand({ TableName: this.tableName }),
    );
    return result.Items || [];
  }

  async findOne(teamId: string) {
    const result = await this.dynamo.send(
      new GetCommand({ TableName: this.tableName, Key: { teamId } }),
    );
    if (!result.Item) throw new NotFoundException(`Team ${teamId} not found`);
    return result.Item;
  }

  async update(teamId: string, dto: UpdateTeamDto) {
    await this.findOne(teamId);

    const result = await this.dynamo.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { teamId },
        UpdateExpression: 'SET #n = :n, #u = :u',
        ExpressionAttributeNames: { '#n': 'name', '#u': 'updatedAt' },
        ExpressionAttributeValues: {
          ':n': dto.name,
          ':u': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
      }),
    );
    return result.Attributes;
  }

  async remove(teamId: string) {
    await this.findOne(teamId);
    await this.dynamo.send(
      new DeleteCommand({ TableName: this.tableName, Key: { teamId } }),
    );
    return { deleted: true };
  }
}
