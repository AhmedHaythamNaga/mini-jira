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
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const lib_dynamodb_2 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const dynamodb_module_1 = require("../dynamodb/dynamodb.module");
let ProjectsService = class ProjectsService {
    constructor(dynamo, config) {
        this.dynamo = dynamo;
        this.config = config;
        this.tableName = this.config.get('DYNAMODB_PROJECTS_TABLE', 'mini-jira-projects');
    }
    async create(dto, user) {
        const project = {
            projectId: (0, uuid_1.v4)(),
            name: dto.name,
            description: dto.description || '',
            createdBy: user.userId,
            createdAt: new Date().toISOString(),
        };
        await this.dynamo.send(new lib_dynamodb_2.PutCommand({ TableName: this.tableName, Item: project }));
        return project;
    }
    async findAll() {
        const result = await this.dynamo.send(new lib_dynamodb_2.ScanCommand({ TableName: this.tableName }));
        return result.Items || [];
    }
    async findOne(projectId) {
        const result = await this.dynamo.send(new lib_dynamodb_2.GetCommand({ TableName: this.tableName, Key: { projectId } }));
        if (!result.Item)
            throw new common_1.NotFoundException(`Project ${projectId} not found`);
        return result.Item;
    }
    async update(projectId, dto) {
        await this.findOne(projectId);
        const expressionParts = [];
        const names = {};
        const values = {};
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
        if (expressionParts.length === 0)
            return this.findOne(projectId);
        expressionParts.push('#u = :u');
        names['#u'] = 'updatedAt';
        values[':u'] = new Date().toISOString();
        const result = await this.dynamo.send(new lib_dynamodb_2.UpdateCommand({
            TableName: this.tableName,
            Key: { projectId },
            UpdateExpression: `SET ${expressionParts.join(', ')}`,
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values,
            ReturnValues: 'ALL_NEW',
        }));
        return result.Attributes;
    }
    async remove(projectId) {
        await this.findOne(projectId);
        await this.dynamo.send(new lib_dynamodb_2.DeleteCommand({ TableName: this.tableName, Key: { projectId } }));
        return { deleted: true };
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(dynamodb_module_1.DYNAMO_CLIENT)),
    __metadata("design:paramtypes", [lib_dynamodb_1.DynamoDBDocumentClient,
        config_1.ConfigService])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map