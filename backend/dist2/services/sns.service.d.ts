import { PublishCommandOutput } from "@aws-sdk/client-sns";
export interface TaskAssignment {
    taskId: string;
    taskTitle: string;
    assigneeId?: string;
    assigneeName?: string;
    assigneeEmail?: string;
    teamId?: string;
    assignedBy?: string;
}
export declare function publishTaskAssignment(taskData: TaskAssignment): Promise<PublishCommandOutput>;
