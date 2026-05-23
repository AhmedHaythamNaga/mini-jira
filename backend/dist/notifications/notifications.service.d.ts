import { ConfigService } from '@nestjs/config';
import { buildAssignmentEmailBody } from './assignment-message';
export interface TaskAssignmentPayload {
    taskID: string;
    taskTitle: string;
    assigneeID?: string;
    assigneeName?: string;
    assigneeEmail?: string;
    teamID?: string;
    assignedBy?: string;
}
export declare class NotificationsService {
    private readonly config;
    private readonly logger;
    private readonly sns;
    private readonly topicArn;
    constructor(config: ConfigService);
    publishTaskAssignment(payload: TaskAssignmentPayload): Promise<void>;
}
export { buildAssignmentEmailBody };
