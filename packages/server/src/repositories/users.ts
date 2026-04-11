import { eq } from "drizzle-orm";
import { users } from "../db/schema.js";
import type { Database } from "../lib/context.js";

export function findAll(db: Database) {
  return db.select().from(users);
}

export async function findBySlackUserId(db: Database, slackUserId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.slackUserId, slackUserId))
    .limit(1);
  return user;
}

export async function insert(
  db: Database,
  input: { slackUserId: string; displayName: string },
) {
  const [user] = await db.insert(users).values(input).returning();
  return user;
}
