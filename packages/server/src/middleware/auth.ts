import { createMiddleware } from "hono/factory";
import { auth } from "../lib/auth.js";
import type { Env } from "../lib/context.js";

export const sessionMiddleware = createMiddleware<Env>(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  await next();
});

export const requireAuth = createMiddleware<Env>(async (c, next) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ code: "UNAUTHORIZED", message: "Unauthorized" }, 401);
  }
  await next();
});
