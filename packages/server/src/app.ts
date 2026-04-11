import { Hono } from "hono";
import { auth } from "./lib/auth.js";
import type { Env } from "./lib/context.js";
import { AppError } from "./lib/errors.js";
import { dbMiddleware } from "./middleware/db.js";
import { sessionMiddleware } from "./middleware/auth.js";
import { routes } from "./routes/index.js";

const app = new Hono<Env>()
  .on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw))
  .use(dbMiddleware)
  .use(sessionMiddleware)
  .route("/api", routes);

app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ code: err.code, message: err.message }, err.status as never);
  }

  console.error("Unexpected error:", err);
  return c.json({ code: "INTERNAL_ERROR", message: "Internal Server Error" }, 500);
});

export type AppType = typeof app;

export { app };
