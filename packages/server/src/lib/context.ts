import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { Session, User } from "better-auth";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "../db/schema.js";

export type Database = PostgresJsDatabase<typeof schema>;

export type Env = {
  Variables: {
    db: Database;
    dynamodb: DynamoDBDocumentClient;
    user: User | null;
    session: Session | null;
  };
};
