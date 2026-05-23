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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAssignmentEmailBody = exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_sns_1 = require("@aws-sdk/client-sns");
const assignment_message_1 = require("./assignment-message");
Object.defineProperty(exports, "buildAssignmentEmailBody", { enumerable: true, get: function () { return assignment_message_1.buildAssignmentEmailBody; } });
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(NotificationsService_1.name);
        this.sns = new client_sns_1.SNSClient({
            region: this.config.get('AWS_REGION', 'us-east-1'),
        });
        this.topicArn = this.config.get('SNS_TASK_ASSIGNMENT_TOPIC_ARN', '');
    }
    async publishTaskAssignment(payload) {
        const assigneeEmail = payload.assigneeEmail?.trim().toLowerCase();
        if (!assigneeEmail) {
            this.logger.warn(`Skipping task assignment notification for task ${payload.taskID}: assignee has no email`);
            return;
        }
        if (!this.topicArn) {
            this.logger.warn('SNS_TASK_ASSIGNMENT_TOPIC_ARN not configured, skipping assignment notification');
            return;
        }
        const message = {
            type: 'TASK_ASSIGNED',
            taskID: payload.taskID,
            taskTitle: payload.taskTitle,
            assigneeID: payload.assigneeID,
            assigneeName: payload.assigneeName,
            assigneeEmail,
            teamID: payload.teamID,
            assignedBy: payload.assignedBy,
            timestamp: new Date().toISOString(),
        };
        await this.sns.send(new client_sns_1.PublishCommand({
            TopicArn: this.topicArn,
            Subject: `Mini-Jira: Task assigned — ${payload.taskTitle}`,
            Message: JSON.stringify(message),
            MessageAttributes: {
                type: { DataType: 'String', StringValue: 'TASK_ASSIGNED' },
                assigneeEmail: { DataType: 'String', StringValue: assigneeEmail },
                taskID: { DataType: 'String', StringValue: payload.taskID },
            },
        }));
        this.logger.log(`Published TASK_ASSIGNED to SNS for ${assigneeEmail} (task ${payload.taskID})`);
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map