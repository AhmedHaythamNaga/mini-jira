import crypto from 'crypto';
import { SQSEvent } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const dynamodb = new DynamoDBClient({});
const cloudwatch = new CloudWatchClient({});
const ses = new SESClient({});

export interface AssignmentMessage {
  taskID: string;
  taskTitle: string;
  assigneeID?: string;
  assigneeName?: string;
  assigneeEmail: string;
  teamID?: string;
  assignedBy?: string;
}

export const handler = async (event: SQSEvent): Promise<{ statusCode: number }> => {
  console.log('EVENT:', JSON.stringify(event));

  for (const record of event.Records) {
    const message = JSON.parse(record.body) as AssignmentMessage;

    console.log('MESSAGE:', message);

    // Validate required env vars
    if (!process.env.EMAIL_SOURCE) {
      throw new Error('EMAIL_SOURCE is not defined');
    }
    if (!process.env.AUDIT_LOG_TABLE) {
      throw new Error('AUDIT_LOG_TABLE is not defined');
    }

    // 1. SEND EMAIL
    await ses.send(
      new SendEmailCommand({
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
      }),
    );

    // 2. WRITE AUDIT LOG
    await dynamodb.send(
      new PutItemCommand({
        TableName: process.env.AUDIT_LOG_TABLE,
        Item: {
          LogID: { S: crypto.randomUUID() },
          taskID: { S: message.taskID },
          action: { S: 'TASK_ASSIGNED' },
          assigneeID: { S: message.assigneeID || '' },
          teamID: { S: message.teamID || '' },
          timestamp: { S: new Date().toISOString() },
        },
      }),
    );

    // 3. PUBLISH CLOUDWATCH METRIC
    await cloudwatch.send(
      new PutMetricDataCommand({
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
      }),
    );
  }

  return {
    statusCode: 200,
  };
};
