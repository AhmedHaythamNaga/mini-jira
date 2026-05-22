import { SQSEvent } from 'aws-lambda';
export interface AssignmentMessage {
    taskID: string;
    taskTitle: string;
    assigneeID?: string;
    assigneeName?: string;
    assigneeEmail: string;
    teamID?: string;
    assignedBy?: string;
}
export declare const handler: (event: SQSEvent) => Promise<{
    statusCode: number;
}>;
