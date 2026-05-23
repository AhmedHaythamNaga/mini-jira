"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const crypto_1 = require("crypto");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const client_cloudwatch_1 = require("@aws-sdk/client-cloudwatch");
const client_ses_1 = require("@aws-sdk/client-ses");
const assignment_message_1 = require("../notifications/assignment-message");
const dynamodb = new client_dynamodb_1.DynamoDBClient({});
const cloudwatch = new client_cloudwatch_1.CloudWatchClient({});
const ses = new client_ses_1.SESClient({});
function extractMessages(event) {
    const records = event.Records ?? [];
    if (!records.length)
        return [];
    if ('Sns' in records[0]) {
        return records.map((record) => (0, assignment_message_1.parseAssignmentMessage)(record.Sns.Message));
    }
    return records.map((record) => (0, assignment_message_1.parseAssignmentMessage)(record.body));
}
async function sendAssignmentEmail(message) {
    const email = message.assigneeEmail?.trim().toLowerCase();
    if (!email) {
        console.warn(`Skipping email for task ${message.taskID}: missing assigneeEmail in SNS message`);
        return;
    }
    const source = process.env.EMAIL_SOURCE;
    if (!source) {
        throw new Error('EMAIL_SOURCE is not defined');
    }
    await ses.send(new client_ses_1.SendEmailCommand({
        Source: source,
        Destination: { ToAddresses: [email] },
        Message: {
            Subject: {
                Data: `Mini-Jira: Task assigned — ${message.taskTitle}`,
            },
            Body: {
                Text: { Data: (0, assignment_message_1.buildAssignmentEmailBody)(message) },
            },
        },
    }));
    console.log(`Assignment email sent to ${email} for task ${message.taskID}`);
}
const handler = async (event) => {
    console.log('EVENT:', JSON.stringify(event));
    if (!process.env.AUDIT_LOG_TABLE) {
        throw new Error('AUDIT_LOG_TABLE is not defined');
    }
    const messages = extractMessages(event);
    if (!messages.length) {
        console.warn('No assignment messages to process');
        return { statusCode: 200 };
    }
    for (const message of messages) {
        if (message.type && message.type !== 'TASK_ASSIGNED') {
            console.log(`Ignoring message type ${message.type}`);
            continue;
        }
        console.log('MESSAGE:', message);
        await sendAssignmentEmail(message);
        await dynamodb.send(new client_dynamodb_1.PutItemCommand({
            TableName: process.env.AUDIT_LOG_TABLE,
            Item: {
                LogID: { S: crypto_1.default.randomUUID() },
                taskID: { S: message.taskID },
                action: { S: 'TASK_ASSIGNED_EMAIL_SENT' },
                assigneeID: { S: message.assigneeID || '' },
                assigneeEmail: { S: message.assigneeEmail || '' },
                teamID: { S: message.teamID || '' },
                timestamp: { S: message.timestamp || new Date().toISOString() },
            },
        }));
        await cloudwatch.send(new client_cloudwatch_1.PutMetricDataCommand({
            Namespace: 'MiniJira',
            MetricData: [
                {
                    MetricName: 'TasksAssignedPerTeam',
                    Dimensions: [
                        {
                            Name: 'TeamId',
                            Value: message.teamID || 'unknown',
                        },
                    ],
                    Unit: 'Count',
                    Value: 1,
                },
            ],
        }));
    }
    return { statusCode: 200 };
};
exports.handler = handler;
//# sourceMappingURL=assignmentWorker.js.map