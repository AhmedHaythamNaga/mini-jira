import crypto from 'crypto';
import type { SQSEvent, SNSEvent } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import {
  buildAssignmentEmailBody,
  parseAssignmentMessage,
  TaskAssignmentMessage,
} from '../notifications/assignment-message';

const dynamodb = new DynamoDBClient({});
const cloudwatch = new CloudWatchClient({});
const ses = new SESClient({});

function extractMessages(event: SQSEvent | SNSEvent): TaskAssignmentMessage[] {
  const records = event.Records ?? [];
  if (!records.length) return [];

  if ('Sns' in records[0]) {
    return (records as SNSEvent['Records']).map((record) =>
      parseAssignmentMessage(record.Sns.Message),
    );
  }

  return (records as SQSEvent['Records']).map((record) =>
    parseAssignmentMessage(record.body),
  );
}

async function sendAssignmentEmail(message: TaskAssignmentMessage) {
  const email = message.assigneeEmail?.trim().toLowerCase();
  if (!email) {
    console.warn(
      `Skipping email for task ${message.taskID}: missing assigneeEmail in SNS message`,
    );
    return;
  }

  const source = process.env.EMAIL_SOURCE;
  if (!source) {
    throw new Error('EMAIL_SOURCE is not defined');
  }

  await ses.send(
    new SendEmailCommand({
      Source: source,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: {
          Data: `Mini-Jira: Task assigned — ${message.taskTitle}`,
        },
        Body: {
          Text: { Data: buildAssignmentEmailBody(message) },
        },
      },
    }),
  );

  console.log(`Assignment email sent to ${email} for task ${message.taskID}`);
}

export const handler = async (
  event: SQSEvent | SNSEvent,
): Promise<{ statusCode: number }> => {
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

    await dynamodb.send(
      new PutItemCommand({
        TableName: process.env.AUDIT_LOG_TABLE,
        Item: {
          LogID: { S: crypto.randomUUID() },
          taskID: { S: message.taskID },
          action: { S: 'TASK_ASSIGNED_EMAIL_SENT' },
          assigneeID: { S: message.assigneeID || '' },
          assigneeEmail: { S: message.assigneeEmail || '' },
          teamID: { S: message.teamID || '' },
          timestamp: { S: message.timestamp || new Date().toISOString() },
        },
      }),
    );

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

  return { statusCode: 200 };
};
