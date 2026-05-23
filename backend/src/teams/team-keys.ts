import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { getItemByIdVariants } from '../dynamodb/dynamodb-helpers';

/** Collect team id/name variants so queries match tasks stored with either form. */
export async function resolveTeamKeys(
  dynamo: DynamoDBDocumentClient,
  teamsTable: string,
  teamRef: string | undefined,
): Promise<string[]> {
  if (!teamRef?.trim()) return [];

  const keys = new Set<string>([teamRef.trim()]);

  try {
    const team = await getItemByIdVariants(dynamo, teamsTable, teamRef, [
      'teamID',
      'teamId',
    ]);
    if (team) {
      const id = (team.teamID as string) ?? (team.teamId as string);
      if (id) keys.add(id);
      if (team.name) keys.add(team.name as string);
    }
  } catch {
    const result = await dynamo.send(
      new ScanCommand({ TableName: teamsTable }),
    );
    for (const team of result.Items || []) {
      const id = (team.teamID as string) ?? (team.teamId as string);
      const name = team.name as string | undefined;
      if (teamRef === id || teamRef === name) {
        if (id) keys.add(id);
        if (name) keys.add(name);
      }
    }
  }

  return [...keys];
}

export function readRecordTeamId(item: Record<string, unknown>): string {
  return (
    (item.teamID as string | undefined) ??
    (item.teamId as string | undefined) ??
    ''
  );
}

export function recordMatchesTeamKeys(
  item: Record<string, unknown>,
  teamKeys: string[],
): boolean {
  const team = readRecordTeamId(item);
  return Boolean(team && teamKeys.includes(team));
}
