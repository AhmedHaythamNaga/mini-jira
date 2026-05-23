import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { buildAssignmentEmailBody, TaskAssignmentMessage } from './assignment-message';

export interface TaskAssignmentPayload {
  taskID: string;
  taskTitle: string;
  assigneeID?: string;
  assigneeName?: string;
  assigneeEmail?: string;
  teamID?: string;
  assignedBy?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly sns: SNSClient;
  private readonly topicArn: string;

  constructor(private readonly config: ConfigService) {
    this.sns = new SNSClient({
      region: this.config.get<string>('AWS_REGION', 'us-east-1'),
    });
    this.topicArn = this.config.get<string>('SNS_TASK_ASSIGNMENT_TOPIC_ARN', '');
  }

  async publishTaskAssignment(payload: TaskAssignmentPayload): Promise<void> {
    const assigneeEmail = payload.assigneeEmail?.trim().toLowerCase();
    if (!assigneeEmail) {
      this.logger.warn(
        `Skipping task assignment notification for task ${payload.taskID}: assignee has no email`,
      );
      return;
    }

    if (!this.topicArn) {
      this.logger.warn(
        'SNS_TASK_ASSIGNMENT_TOPIC_ARN not configured, skipping assignment notification',
      );
      return;
    }

    const message: TaskAssignmentMessage = {
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

    await this.sns.send(
      new PublishCommand({
        TopicArn: this.topicArn,
        Subject: `Mini-Jira: Task assigned — ${payload.taskTitle}`,
        Message: JSON.stringify(message),
        MessageAttributes: {
          type: { DataType: 'String', StringValue: 'TASK_ASSIGNED' },
          assigneeEmail: { DataType: 'String', StringValue: assigneeEmail },
          taskID: { DataType: 'String', StringValue: payload.taskID },
        },
      }),
    );

    this.logger.log(
      `Published TASK_ASSIGNED to SNS for ${assigneeEmail} (task ${payload.taskID})`,
    );
  }
}

export { buildAssignmentEmailBody };
