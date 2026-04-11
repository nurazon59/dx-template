import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { z } from "zod";
import type { Env } from "../lib/context.js";
import { ErrorSchema } from "../schemas/error.js";
import { CreateUserInputSchema, UserSchema } from "../schemas/user.js";
import { createUser, findBySlackUserId, listUsers } from "../services/users.js";

export const usersRoute = new Hono<Env>()
  .get(
    "/",
    describeRoute({
      tags: ["Users"],
      responses: {
        200: {
          description: "ユーザー一覧",
          content: {
            "application/json": {
              schema: resolver(z.object({ users: z.array(UserSchema) })),
            },
          },
        },
      },
    }),
    async (c) => {
      const result = await listUsers(c.var.db);
      return c.json({ users: result });
    },
  )
  .post(
    "/",
    describeRoute({
      tags: ["Users"],
      responses: {
        201: {
          description: "ユーザー作成成功",
          content: {
            "application/json": {
              schema: resolver(z.object({ user: UserSchema })),
            },
          },
        },
        409: {
          description: "ユーザー重複",
          content: {
            "application/json": {
              schema: resolver(ErrorSchema),
            },
          },
        },
      },
    }),
    validator("json", CreateUserInputSchema),
    async (c) => {
      const input = c.req.valid("json");
      const user = await createUser(c.var.db, input);
      return c.json({ user }, 201);
    },
  )
  .get(
    "/:slackUserId",
    describeRoute({
      tags: ["Users"],
      responses: {
        200: {
          description: "ユーザー取得",
          content: {
            "application/json": {
              schema: resolver(z.object({ user: UserSchema })),
            },
          },
        },
        404: {
          description: "ユーザーが見つからない",
          content: {
            "application/json": {
              schema: resolver(ErrorSchema),
            },
          },
        },
      },
    }),
    async (c) => {
      const { slackUserId } = c.req.param();
      const user = await findBySlackUserId(c.var.db, slackUserId);
      return c.json({ user });
    },
  );
