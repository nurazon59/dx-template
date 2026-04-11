import { createMiddleware } from "hono/factory";
import type { Env } from "../lib/context.js";
import { dynamodb } from "../lib/dynamodb.js";

export const dynamodbMiddleware = createMiddleware<Env>(async (c, next) => {
  c.set("dynamodb", dynamodb);
  await next();
});
