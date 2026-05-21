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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_sns_1 = require("@aws-sdk/client-sns");
let NotificationsService = class NotificationsService {
    constructor(config) {
        this.config = config;
        this.sns = new client_sns_1.SNSClient({
            region: this.config.get('AWS_REGION', 'us-east-1'),
        });
        this.topicArn = this.config.get('SNS_TASK_ASSIGNMENT_TOPIC_ARN', '');
    }
    async publishTaskAssignment(payload) {
        if (!this.topicArn) {
            console.warn('SNS_TASK_ASSIGNMENT_TOPIC_ARN not configured, skipping notification');
            return;
        }
        await this.sns.send(new client_sns_1.PublishCommand({
            TopicArn: this.topicArn,
            Message: JSON.stringify({
                type: 'TASK_ASSIGNED',
                ...payload,
                timestamp: new Date().toISOString(),
            }),
            Subject: `Task Assigned: ${payload.taskTitle}`,
        }));
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map