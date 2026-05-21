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
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const lib_dynamodb_2 = require("@aws-sdk/lib-dynamodb");
const dynamodb_module_1 = require("../dynamodb/dynamodb.module");
let AuditService = class AuditService {
    constructor(dynamo, config) {
        this.dynamo = dynamo;
        this.config = config;
        this.tableName = this.config.get('DYNAMODB_AUDIT_TABLE', 'mini-jira-audit');
    }
    async findByTask(taskId) {
        const result = await this.dynamo.send(new lib_dynamodb_2.QueryCommand({
            TableName: this.tableName,
            IndexName: 'taskId-index',
            KeyConditionExpression: 'taskId = :taskId',
            ExpressionAttributeValues: { ':taskId': taskId },
        }));
        const items = result.Items || [];
        return items.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(dynamodb_module_1.DYNAMO_CLIENT)),
    __metadata("design:paramtypes", [lib_dynamodb_1.DynamoDBDocumentClient,
        config_1.ConfigService])
], AuditService);
//# sourceMappingURL=audit.service.js.map