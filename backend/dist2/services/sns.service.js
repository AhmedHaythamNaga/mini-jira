"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishTaskAssignment = publishTaskAssignment;
const client_sns_1 = require("@aws-sdk/client-sns");
const sns = new client_sns_1.SNSClient({
    region: process.env.AWS_REGION,
});
async function publishTaskAssignment(taskData) {
    const topicArn = process.env.SNS_TOPIC_ARN;
    if (!topicArn) {
        throw new Error('SNS_TOPIC_ARN is not defined');
    }
    const command = new client_sns_1.PublishCommand({
        TopicArn: topicArn,
        Message: JSON.stringify({
            type: "TASK_ASSIGNED",
            taskId: taskData.taskId,
            taskTitle: taskData.taskTitle,
            assigneeId: taskData.assigneeId,
            assigneeName: taskData.assigneeName,
            assigneeEmail: taskData.assigneeEmail,
            teamId: taskData.teamId,
            assignedBy: taskData.assignedBy,
            timestamp: new Date().toISOString(),
        }),
    });
    return sns.send(command);
}
//# sourceMappingURL=sns.service.js.map