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
export declare function parseAssignmentMessage(raw: string): TaskAssignmentMessage;
export declare function buildAssignmentEmailBody(message: TaskAssignmentMessage): string;
