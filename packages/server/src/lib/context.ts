import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "../db/schema.js";

export type Database = PostgresJsDatabase<typeof schema>;

export type Env = {
  Variables: {
    db: Database;
  };
};
