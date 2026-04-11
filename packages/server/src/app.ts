import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import { auth } from "./lib/auth.js";
import type { Env } from "./lib/context.js";
import { AppError } from "./lib/errors.js";
import { sessionMiddleware } from "./middleware/auth.js";
import { dbMiddleware } from "./middleware/db.js";
import { dynamodbMiddleware } from "./middleware/dynamodb.js";
import { routes } from "./routes/index.js";

const app = new Hono<Env>()
  .on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw))
  .use(dbMiddleware)
  .use(dynamodbMiddleware)
  .use(sessionMiddleware)
  .route("/api", routes);

app.get(
  "/api/doc",
  openAPIRouteHandler(app, {
    documentation: {
      openapi: "3.1.0",
      info: { title: "DX Template API", version: "1.0.0" },
    },
  }),
);

app.get(
  "/api/reference",
  Scalar({
    url: "/api/doc",
  }),
);

app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ code: err.code, message: err.message }, err.status as never);
  }

  console.error("Unexpected error:", err);
  return c.json({ code: "INTERNAL_ERROR", message: "Internal Server Error" }, 500);
});

export { app };
