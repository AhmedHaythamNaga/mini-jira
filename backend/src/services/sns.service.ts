import { SNSClient, PublishCommand, PublishCommandOutput } from "@aws-sdk/client-sns";

export interface TaskAssignment {
  taskId: string;
  taskTitle: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeEmail?: string;
  teamId?: string;
  assignedBy?: string;
}

const sns = new SNSClient({
  region: process.env.AWS_REGION,
});

export async function publishTaskAssignment(
  taskData: TaskAssignment,
): Promise<PublishCommandOutput> {
  const topicArn = process.env.SNS_TOPIC_ARN;
  if (!topicArn) {
    throw new Error('SNS_TOPIC_ARN is not defined');
  }

  const command = new PublishCommand({
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
