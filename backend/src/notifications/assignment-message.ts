export interface TaskAssignmentMessage {
  type?: string;
  taskID: string;
  taskTitle: string;
  assigneeID?: string;
  assigneeName?: string;
  assigneeEmail?: string;
  teamID?: string;
  assignedBy?: string;
  timestamp?: string;
}

/** Parse assignment payload from SQS (SNS-wrapped) or direct SNS Lambda events. */
export function parseAssignmentMessage(raw: string): TaskAssignmentMessage {
  const body = JSON.parse(raw) as Record<string, unknown>;

  if (body.Type === 'Notification' && typeof body.Message === 'string') {
    return JSON.parse(body.Message) as TaskAssignmentMessage;
  }

  if (typeof body.Message === 'string' && !body.taskID) {
    return JSON.parse(body.Message) as TaskAssignmentMessage;
  }

  return body as unknown as TaskAssignmentMessage;
}

export function buildAssignmentEmailBody(message: TaskAssignmentMessage): string {
  const lines = [
    `Hello ${message.assigneeName || 'there'},`,
    '',
    'You have been assigned a new task in Mini-Jira.',
    '',
    `Task: ${message.taskTitle}`,
    `Task ID: ${message.taskID}`,
  ];

  if (message.assignedBy) {
    lines.push(`Assigned by: ${message.assignedBy}`);
  }
  if (message.teamID) {
    lines.push(`Team ID: ${message.teamID}`);
  }
  if (message.timestamp) {
    lines.push(`Assigned at: ${message.timestamp}`);
  }

  lines.push('', 'Please log in to the app to view and update the task.');
  return lines.join('\n');
}
