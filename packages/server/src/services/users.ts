import type { Database } from "../lib/context.js";
import { AppError } from "../lib/errors.js";
import * as usersRepo from "../repositories/users.js";

export function listUsers(db: Database) {
  return usersRepo.findAll(db);
}

export async function createUser(
  db: Database,
  input: { slackUserId: string; displayName: string },
) {
  const existing = await usersRepo.findBySlackUserId(db, input.slackUserId);

  if (existing) {
    throw new AppError(
      "USER_ALREADY_EXISTS",
      `slackUserId=${input.slackUserId} は既に登録済みです`,
      409,
    );
  }

  return usersRepo.insert(db, input);
}

export async function findBySlackUserId(db: Database, slackUserId: string) {
  const user = await usersRepo.findBySlackUserId(db, slackUserId);

  if (!user) {
    throw new AppError("USER_NOT_FOUND", `slackUserId=${slackUserId} が見つかりません`, 404);
  }

  return user;
}
