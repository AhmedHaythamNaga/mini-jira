"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const crypto_1 = require("crypto");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const client_cloudwatch_1 = require("@aws-sdk/client-cloudwatch");
const client_ses_1 = require("@aws-sdk/client-ses");
const dynamodb = new client_dynamodb_1.DynamoDBClient({});
const cloudwatch = new client_cloudwatch_1.CloudWatchClient({});
const ses = new client_ses_1.SESClient({});
const handler = async (event) => {
    console.log('EVENT:', JSON.stringify(event));
    for (const record of event.Records) {
        const message = JSON.parse(record.body);
        console.log('MESSAGE:', message);
        if (!process.env.EMAIL_SOURCE) {
            throw new Error('EMAIL_SOURCE is not defined');
        }
        if (!process.env.AUDIT_LOG_TABLE) {
            throw new Error('AUDIT_LOG_TABLE is not defined');
        }
        await ses.send(new client_ses_1.SendEmailCommand({
            Source: process.env.EMAIL_SOURCE,
            Destination: {
                ToAddresses: [message.assigneeEmail],
            },
            Message: {
                Subject: {
                    Data: 'New Task Assigned',
                },
                Body: {
                    Text: {
                        Data: `Hello ${message.assigneeName || ''},\n\nYou were assigned a new task.\n\nTask:\n${message.taskTitle}\n\nAssigned By:\n${message.assignedBy || ''}`,
                    },
                },
            },
        }));
        await dynamodb.send(new client_dynamodb_1.PutItemCommand({
            TableName: process.env.AUDIT_LOG_TABLE,
            Item: {
                LogID: { S: crypto_1.default.randomUUID() },
                taskID: { S: message.taskID },
                action: { S: 'TASK_ASSIGNED' },
                assigneeID: { S: message.assigneeID || '' },
                teamID: { S: message.teamID || '' },
                timestamp: { S: new Date().toISOString() },
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
    return {
        statusCode: 200,
    };
};
exports.handler = handler;
//# sourceMappingURL=assignmentWorker.js.map