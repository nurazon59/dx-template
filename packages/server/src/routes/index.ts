import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import type { Env } from "../lib/context.js";
import { AuthUserSchema } from "../schemas/auth.js";
import { ErrorSchema } from "../schemas/error.js";
import { requireAuth } from "../middleware/auth.js";
import { agentRoute } from "./agent.js";
import { filesRoute } from "./files.js";
import { memoriesRoute } from "./memories.js";
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
    "/time",
    describeRoute({
      tags: ["System"],
      responses: {
        200: {
          description: "現在時刻",
          content: {
            "application/json": {
              schema: resolver(z.object({ timestamp: z.string().datetime() })),
            },
          },
        },
      },
    }),
    (c) => c.json({ timestamp: new Date().toISOString() }),
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
  .route("/files", filesRoute)
  .route("/memories", memoriesRoute)
  .route("/uploads", uploadsRoute)
  .route("/users", usersRoute);

export { app as routes };
