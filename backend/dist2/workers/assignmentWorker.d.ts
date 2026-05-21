import { SQSEvent } from 'aws-lambda';
export interface AssignmentMessage {
    taskId: string;
    taskTitle: string;
    assigneeId?: string;
    assigneeName?: string;
    assigneeEmail: string;
    teamId?: string;
    assignedBy?: string;
}
export declare const handler: (event: SQSEvent) => Promise<{
    statusCode: number;
}>;
