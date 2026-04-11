import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env["AWS_REGION"] ?? "ap-northeast-1",
  ...(process.env["DYNAMODB_ENDPOINT"] && {
    endpoint: process.env["DYNAMODB_ENDPOINT"],
  }),
});

export const dynamodb = DynamoDBDocumentClient.from(client);
