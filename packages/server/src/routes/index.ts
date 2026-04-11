import { Hono } from "hono";
import type { Env } from "../lib/context.js";
import { usersRoute } from "./users.js";

const app = new Hono<Env>()
  .get("/health", (c) => c.json({ status: "ok" }))
  .route("/users", usersRoute);

export type AppRoutes = typeof app;

export { app as routes };
