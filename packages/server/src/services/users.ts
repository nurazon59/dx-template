import { eq } from "drizzle-orm";
import { users } from "../db/schema.js";
import type { Database } from "../lib/context.js";
import { AppError } from "../lib/errors.js";

export function listUsers(db: Database) {
  return db.select().from(users);
}

export async function createUser(
  db: Database,
  input: { slackUserId: string; displayName: string },
) {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.slackUserId, input.slackUserId))
    .limit(1);

  if (existing.length > 0) {
    throw new AppError(
      "USER_ALREADY_EXISTS",
      `slackUserId=${input.slackUserId} は既に登録済みです`,
      409,
    );
  }

  const [user] = await db.insert(users).values(input).returning();
  return user;
}

export async function findBySlackUserId(db: Database, slackUserId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.slackUserId, slackUserId))
    .limit(1);

  if (!user) {
    throw new AppError(
      "USER_NOT_FOUND",
      `slackUserId=${slackUserId} が見つかりません`,
      404,
    );
  }

  return user;
}
