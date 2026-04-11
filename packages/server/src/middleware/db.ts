import { createMiddleware } from "hono/factory";
import { db } from "../db/index.js";
import type { Env } from "../lib/context.js";

export const dbMiddleware = createMiddleware<Env>(async (c, next) => {
  c.set("db", db);
  await next();
});
