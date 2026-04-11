import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../lib/context.js";
import { createUser, findBySlackUserId, listUsers } from "../services/users.js";

const createUserSchema = z.object({
  slackUserId: z.string().min(1),
  displayName: z.string().min(1),
});

export const usersRoute = new Hono<Env>()
  .get("/", async (c) => {
    const result = await listUsers(c.var.db);
    return c.json({ users: result });
  })
  .post("/", zValidator("json", createUserSchema), async (c) => {
    const input = c.req.valid("json");
    const user = await createUser(c.var.db, input);
    return c.json({ user }, 201);
  })
  .get("/:slackUserId", async (c) => {
    const { slackUserId } = c.req.param();
    const user = await findBySlackUserId(c.var.db, slackUserId);
    return c.json({ user });
  });
