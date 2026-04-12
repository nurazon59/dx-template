import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import type { Env } from "../lib/context.js";
import { AuthUserSchema } from "../schemas/auth.js";
import { ErrorSchema } from "../schemas/error.js";
import { requireAuth } from "../middleware/auth.js";
import { agentRoute } from "./agent.js";
import { uploadsRoute } from "./uploads.js";
import { usersRoute } from "./users.js";

const app = new Hono<Env>()
  .get(
    "/health",
    describeRoute({
      tags: ["System"],
      responses: {
        200: {
          description: "ヘルスチェック",
          content: {
            "application/json": {
              schema: resolver(z.object({ status: z.literal("ok") })),
            },
          },
        },
      },
    }),
    (c) => c.json({ status: "ok" as const }),
  )
  .get(
    "/me",
    describeRoute({
      tags: ["Auth"],
      responses: {
        200: {
          description: "認証済みユーザー情報",
          content: {
            "application/json": {
              schema: resolver(z.object({ user: AuthUserSchema })),
            },
          },
        },
        401: {
          description: "未認証",
          content: {
            "application/json": {
              schema: resolver(ErrorSchema),
            },
          },
        },
      },
    }),
    requireAuth,
    (c) => {
      const user = c.get("user")!;
      return c.json({ user });
    },
  )
  .route("/agent", agentRoute)
  .route("/uploads", uploadsRoute)
  .route("/users", usersRoute);

export { app as routes };
