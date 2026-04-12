import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { env } from "../env.js";

const client = new DynamoDBClient({
  region: env.AWS_REGION,
  ...(env.DYNAMODB_ENDPOINT && {
    endpoint: env.DYNAMODB_ENDPOINT,
  }),
});

export const dynamodb = DynamoDBDocumentClient.from(client);
