"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTeamKeys = resolveTeamKeys;
exports.readRecordTeamId = readRecordTeamId;
exports.recordMatchesTeamKeys = recordMatchesTeamKeys;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamodb_helpers_1 = require("../dynamodb/dynamodb-helpers");
async function resolveTeamKeys(dynamo, teamsTable, teamRef) {
    if (!teamRef?.trim())
        return [];
    const keys = new Set([teamRef.trim()]);
    try {
        const team = await (0, dynamodb_helpers_1.getItemByIdVariants)(dynamo, teamsTable, teamRef, [
            'teamID',
            'teamId',
        ]);
        if (team) {
            const id = team.teamID ?? team.teamId;
            if (id)
                keys.add(id);
            if (team.name)
                keys.add(team.name);
        }
    }
    catch {
        const result = await dynamo.send(new lib_dynamodb_1.ScanCommand({ TableName: teamsTable }));
        for (const team of result.Items || []) {
            const id = team.teamID ?? team.teamId;
            const name = team.name;
            if (teamRef === id || teamRef === name) {
                if (id)
                    keys.add(id);
                if (name)
                    keys.add(name);
            }
        }
    }
    return [...keys];
}
function readRecordTeamId(item) {
    return (item.teamID ??
        item.teamId ??
        '');
}
function recordMatchesTeamKeys(item, teamKeys) {
    const team = readRecordTeamId(item);
    return Boolean(team && teamKeys.includes(team));
}
//# sourceMappingURL=team-keys.js.map