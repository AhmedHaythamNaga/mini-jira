import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
export declare function getItemByIdVariants(dynamo: DynamoDBDocumentClient, tableName: string, id: string, keyNames: string[]): Promise<Record<string, any> | undefined>;
export declare function queryTaskScopedIndex(dynamo: DynamoDBDocumentClient, tableName: string, taskId: string): Promise<Record<string, unknown>[]>;
export declare function sortByIsoField(items: Record<string, unknown>[], field: string): Record<string, unknown>[];
export declare function buildPrimaryKey(id: string, keyNames: string[], item?: Record<string, unknown>): {
    [x: string]: string;
};
