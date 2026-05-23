"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAssignmentMessage = parseAssignmentMessage;
exports.buildAssignmentEmailBody = buildAssignmentEmailBody;
function parseAssignmentMessage(raw) {
    const body = JSON.parse(raw);
    if (body.Type === 'Notification' && typeof body.Message === 'string') {
        return JSON.parse(body.Message);
    }
    if (typeof body.Message === 'string' && !body.taskID) {
        return JSON.parse(body.Message);
    }
    return body;
}
function buildAssignmentEmailBody(message) {
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
//# sourceMappingURL=assignment-message.js.map