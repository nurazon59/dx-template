import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const tableName = process.env["DYNAMODB_TABLE_NAME"] ?? "";

export interface EventInput {
  type: string;
  id: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export async function putEvent(dynamodb: DynamoDBDocumentClient, input: EventInput) {
  const command = new PutCommand({
    TableName: tableName,
    Item: {
      pk: `EVENT#${input.type}`,
      sk: `${input.timestamp}#${input.id}`,
      ...input,
    },
  });
  return dynamodb.send(command);
}

export async function queryEventsByType(dynamodb: DynamoDBDocumentClient, type: string) {
  const command = new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: "pk = :pk",
    ExpressionAttributeValues: {
      ":pk": `EVENT#${type}`,
    },
  });
  const result = await dynamodb.send(command);
  return result.Items ?? [];
}
