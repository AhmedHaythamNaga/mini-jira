import { PublishCommandOutput } from "@aws-sdk/client-sns";
export interface TaskAssignment {
    taskID: string;
    taskTitle: string;
    assigneeID?: string;
    assigneeName?: string;
    assigneeEmail?: string;
    teamID?: string;
    assignedBy?: string;
}
export declare function publishTaskAssignment(taskData: TaskAssignment): Promise<PublishCommandOutput>;
