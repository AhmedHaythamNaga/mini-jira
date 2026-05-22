"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishTaskAssignment = publishTaskAssignment;
const client_sns_1 = require("@aws-sdk/client-sns");
const sns = new client_sns_1.SNSClient({
    region: process.env.AWS_REGION,
});
async function publishTaskAssignment(taskData) {
    const topicArn = process.env.SNS_TASK_ASSIGNMENT_TOPIC_ARN || process.env.SNS_TOPIC_ARN;
    if (!topicArn) {
        throw new Error('SNS_TASK_ASSIGNMENT_TOPIC_ARN is not defined');
    }
    const command = new client_sns_1.PublishCommand({
        TopicArn: topicArn,
        Message: JSON.stringify({
            type: "TASK_ASSIGNED",
            taskID: taskData.taskID,
            taskTitle: taskData.taskTitle,
            assigneeID: taskData.assigneeID,
            assigneeName: taskData.assigneeName,
            assigneeEmail: taskData.assigneeEmail,
            teamID: taskData.teamID,
            assignedBy: taskData.assignedBy,
            timestamp: new Date().toISOString(),
        }),
    });
    return sns.send(command);
}
//# sourceMappingURL=sns.service.js.map