import { Hono } from "hono";

const app = new Hono()
  .get("/health", (c) => c.json({ status: "ok" }))
  .get("/users", async (c) => {
    // TODO: db連携
    return c.json({ users: [] });
  });

export type AppRoutes = typeof app;

export { app as routes };
