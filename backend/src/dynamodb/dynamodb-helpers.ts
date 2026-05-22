import { DynamoDBDocumentClient, GetCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

type GsiQuerySpec = {
  indexName: string;
  partitionKey: string;
};

/**
 * Load one item when the table may use taskID/taskId (or userID/userId) key names.
 */
export async function getItemByIdVariants(
  dynamo: DynamoDBDocumentClient,
  tableName: string,
  id: string,
  keyNames: string[],
) {
  for (const keyName of keyNames) {
    try {
      const result = await dynamo.send(
        new GetCommand({ TableName: tableName, Key: { [keyName]: id } }),
      );
      if (result.Item) return result.Item;
    } catch {
      // Try the next key attribute name.
    }
  }
  return undefined;
}

/**
 * Query a task-scoped GSI (comments/audit). Tries common index + attribute naming from AWS setup guides.
 */
export async function queryTaskScopedIndex(
  dynamo: DynamoDBDocumentClient,
  tableName: string,
  taskId: string,
): Promise<Record<string, unknown>[]> {
  const attempts: GsiQuerySpec[] = [
    { indexName: 'taskID-index', partitionKey: 'taskID' },
    { indexName: 'taskId-index', partitionKey: 'taskId' },
  ];

  for (const { indexName, partitionKey } of attempts) {
    try {
      const result = await dynamo.send(
        new QueryCommand({
          TableName: tableName,
          IndexName: indexName,
          KeyConditionExpression: `${partitionKey} = :id`,
          ExpressionAttributeValues: { ':id': taskId },
        }),
      );
      const items = (result.Items ?? []) as Record<string, unknown>[];
      if (items.length > 0) return items;
    } catch {
      // Index name or key attribute may differ between deployments.
    }
  }

  return scanByTaskId(dynamo, tableName, taskId);
}

/** Fallback when GSIs are missing or use different key names. */
async function scanByTaskId(
  dynamo: DynamoDBDocumentClient,
  tableName: string,
  taskId: string,
): Promise<Record<string, unknown>[]> {
  try {
    const result = await dynamo.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: 'taskID = :id OR taskId = :id',
        ExpressionAttributeValues: { ':id': taskId },
      }),
    );
    return (result.Items ?? []) as Record<string, unknown>[];
  } catch {
    return [];
  }
}

export function sortByIsoField(items: Record<string, unknown>[], field: string) {
  return [...items].sort((left, right) => {
    const a = String(left[field] ?? '');
    const b = String(right[field] ?? '');
    return a.localeCompare(b);
  });
}

/** Pick the partition-key attribute present on a stored item (or the first preferred name). */
export function buildPrimaryKey(
  id: string,
  keyNames: string[],
  item?: Record<string, unknown>,
) {
  if (item) {
    for (const keyName of keyNames) {
      if (item[keyName] !== undefined) {
        return { [keyName]: id };
      }
    }
  }
  return { [keyNames[0]]: id };
}
