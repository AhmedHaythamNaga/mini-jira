import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const sns = new SNSClient({
  region: process.env.AWS_REGION,
});

export async function publishTaskAssignment(taskData) {

  const command = new PublishCommand({
    TopicArn: process.env.SNS_TOPIC_ARN,

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

  return await sns.send(command);
}