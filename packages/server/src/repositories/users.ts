import { eq } from "drizzle-orm";
import { users } from "../db/schema.js";
import type { Database } from "../lib/context.js";

export function findAll(db: Database) {
  return db.select().from(users);
}

export async function findBySlackUserId(db: Database, slackUserId: string) {
  const rows = await db.select().from(users).where(eq(users.slackUserId, slackUserId)).limit(1);
  return rows.at(0);
}

export async function insert(db: Database, input: { slackUserId: string; displayName: string }) {
  const rows = await db.insert(users).values(input).returning();
  return rows.at(0);
}
