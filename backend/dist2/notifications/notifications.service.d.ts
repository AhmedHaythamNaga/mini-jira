import { ConfigService } from '@nestjs/config';
export interface TaskAssignmentPayload {
    taskId: string;
    taskTitle: string;
    assigneeId?: string;
    assigneeName?: string;
    assigneeEmail?: string;
    teamId?: string;
    assignedBy?: string;
}
export declare class NotificationsService {
    private readonly config;
    private readonly sns;
    private readonly topicArn;
    constructor(config: ConfigService);
    publishTaskAssignment(payload: TaskAssignmentPayload): Promise<void>;
}
