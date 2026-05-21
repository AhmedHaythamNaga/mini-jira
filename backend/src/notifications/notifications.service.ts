import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

export interface TaskAssignmentPayload {
  taskId: string;
  taskTitle: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeEmail?: string;
  teamId?: string;
  assignedBy?: string;
}

@Injectable()
export class NotificationsService {
  private readonly sns: SNSClient;
  private readonly topicArn: string;

  constructor(private readonly config: ConfigService) {
    this.sns = new SNSClient({
      region: this.config.get<string>('AWS_REGION', 'us-east-1'),
    });
    this.topicArn = this.config.get<string>('SNS_TASK_ASSIGNMENT_TOPIC_ARN', '');
  }

  async publishTaskAssignment(payload: TaskAssignmentPayload): Promise<void> {
    if (!this.topicArn) {
      console.warn('SNS_TASK_ASSIGNMENT_TOPIC_ARN not configured, skipping notification');
      return;
    }

    await this.sns.send(
      new PublishCommand({
        TopicArn: this.topicArn,
        Message: JSON.stringify({
          type: 'TASK_ASSIGNED',
          ...payload,
          timestamp: new Date().toISOString(),
        }),
        Subject: `Task Assigned: ${payload.taskTitle}`,
      }),
    );
  }
}
