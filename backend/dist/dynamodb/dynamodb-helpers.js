"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getItemByIdVariants = getItemByIdVariants;
exports.queryTaskScopedIndex = queryTaskScopedIndex;
exports.sortByIsoField = sortByIsoField;
exports.buildPrimaryKey = buildPrimaryKey;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
async function getItemByIdVariants(dynamo, tableName, id, keyNames) {
    for (const keyName of keyNames) {
        try {
            const result = await dynamo.send(new lib_dynamodb_1.GetCommand({ TableName: tableName, Key: { [keyName]: id } }));
            if (result.Item)
                return result.Item;
        }
        catch {
        }
    }
    return undefined;
}
async function queryTaskScopedIndex(dynamo, tableName, taskId) {
    const attempts = [
        { indexName: 'taskID-index', partitionKey: 'taskID' },
        { indexName: 'taskId-index', partitionKey: 'taskId' },
    ];
    for (const { indexName, partitionKey } of attempts) {
        try {
            const result = await dynamo.send(new lib_dynamodb_1.QueryCommand({
                TableName: tableName,
                IndexName: indexName,
                KeyConditionExpression: `${partitionKey} = :id`,
                ExpressionAttributeValues: { ':id': taskId },
            }));
            const items = (result.Items ?? []);
            if (items.length > 0)
                return items;
        }
        catch {
        }
    }
    return scanByTaskId(dynamo, tableName, taskId);
}
async function scanByTaskId(dynamo, tableName, taskId) {
    try {
        const result = await dynamo.send(new lib_dynamodb_1.ScanCommand({
            TableName: tableName,
            FilterExpression: 'taskID = :id OR taskId = :id',
            ExpressionAttributeValues: { ':id': taskId },
        }));
        return (result.Items ?? []);
    }
    catch {
        return [];
    }
}
function sortByIsoField(items, field) {
    return [...items].sort((left, right) => {
        const a = String(left[field] ?? '');
        const b = String(right[field] ?? '');
        return a.localeCompare(b);
    });
}
function buildPrimaryKey(id, keyNames, item) {
    if (item) {
        for (const keyName of keyNames) {
            if (item[keyName] !== undefined) {
                return { [keyName]: id };
            }
        }
    }
    return { [keyNames[0]]: id };
}
//# sourceMappingURL=dynamodb-helpers.js.map