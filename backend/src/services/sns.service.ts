import { SNSClient, PublishCommand, PublishCommandOutput } from "@aws-sdk/client-sns";

export interface TaskAssignment {
  taskID: string;
  taskTitle: string;
  assigneeID?: string;
  assigneeName?: string;
  assigneeEmail?: string;
  teamID?: string;
  assignedBy?: string;
}

const sns = new SNSClient({
  region: process.env.AWS_REGION,
});

export async function publishTaskAssignment(
  taskData: TaskAssignment,
): Promise<PublishCommandOutput> {
  const topicArn = process.env.SNS_TASK_ASSIGNMENT_TOPIC_ARN || process.env.SNS_TOPIC_ARN;
  if (!topicArn) {
    throw new Error('SNS_TASK_ASSIGNMENT_TOPIC_ARN is not defined');
  }

  const command = new PublishCommand({
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
