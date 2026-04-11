import { Hono } from "hono";
import type { Env } from "../lib/context.js";
import { requireAuth } from "../middleware/auth.js";
import { usersRoute } from "./users.js";

const app = new Hono<Env>()
  .get("/health", (c) => c.json({ status: "ok" }))
  .get("/me", requireAuth, (c) => {
    const user = c.get("user")!;
    return c.json({ user });
  })
  .route("/users", usersRoute);

export type AppRoutes = typeof app;

export { app as routes };
