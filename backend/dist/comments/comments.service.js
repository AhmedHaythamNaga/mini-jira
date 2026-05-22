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
exports.CommentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const lib_dynamodb_2 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const dynamodb_module_1 = require("../dynamodb/dynamodb.module");
let CommentsService = class CommentsService {
    constructor(dynamo, config) {
        this.dynamo = dynamo;
        this.config = config;
        this.tableName = this.config.get('DYNAMODB_COMMENTS_TABLE', 'mini-jira-comments');
        this.tasksTable = this.config.get('DYNAMODB_TASKS_TABLE', 'mini-jira-tasks');
    }
    async create(taskId, dto, user) {
        const taskRes = await this.dynamo.send(new lib_dynamodb_2.GetCommand({ TableName: this.tasksTable, Key: { taskID: taskId } }));
        if (!taskRes.Item)
            throw new common_1.NotFoundException(`Task ${taskId} not found`);
        if (user && user.role === 'employee' && user.teamId) {
            const taskTeam = taskRes.Item.teamID;
            if (taskTeam && taskTeam !== user.teamId) {
                throw new common_1.ForbiddenException('You are not authorized to comment on this task');
            }
        }
        const comment = {
            commentID: (0, uuid_1.v4)(),
            taskID: taskId,
            authorID: user.userId,
            authorName: user.name,
            content: dto.content,
            createdAt: new Date().toISOString(),
        };
        await this.dynamo.send(new lib_dynamodb_2.PutCommand({ TableName: this.tableName, Item: comment }));
        return comment;
    }
    async findByTask(taskId, user) {
        const taskRes = await this.dynamo.send(new lib_dynamodb_2.GetCommand({ TableName: this.tasksTable, Key: { taskID: taskId } }));
        if (!taskRes.Item)
            throw new common_1.NotFoundException(`Task ${taskId} not found`);
        if (user && user.role === 'employee' && user.teamId) {
            const taskTeam = taskRes.Item.teamID;
            if (taskTeam && taskTeam !== user.teamId) {
                throw new common_1.ForbiddenException('You are not authorized to view comments for this task');
            }
        }
        const result = await this.dynamo.send(new lib_dynamodb_2.QueryCommand({
            TableName: this.tableName,
            IndexName: 'taskID-index',
            KeyConditionExpression: 'taskID = :taskID',
            ExpressionAttributeValues: { ':taskID': taskId },
        }));
        const items = result.Items || [];
        return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
};
exports.CommentsService = CommentsService;
exports.CommentsService = CommentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(dynamodb_module_1.DYNAMO_CLIENT)),
    __metadata("design:paramtypes", [lib_dynamodb_1.DynamoDBDocumentClient,
        config_1.ConfigService])
], CommentsService);
//# sourceMappingURL=comments.service.js.map