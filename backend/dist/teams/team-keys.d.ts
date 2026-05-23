import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
export declare function resolveTeamKeys(dynamo: DynamoDBDocumentClient, teamsTable: string, teamRef: string | undefined): Promise<string[]>;
export declare function readRecordTeamId(item: Record<string, unknown>): string;
export declare function recordMatchesTeamKeys(item: Record<string, unknown>, teamKeys: string[]): boolean;
