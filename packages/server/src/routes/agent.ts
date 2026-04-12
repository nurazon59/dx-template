import {
  AgentConfigurationError,
  runAgent,
  AgentRunInputSchema,
  AgentRunResultSchema,
} from "@dx-template/agent";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { WorkflowContext } from "@dx-template/workflow";
import type { Env } from "../lib/context.js";
import { AppError } from "../lib/errors.js";
import { ErrorSchema } from "../schemas/error.js";

function createWorkflowContext(): WorkflowContext {
  return {
    queries: {},
  };
}

export const agentRoute = new Hono<Env>().post(
  "/runs",
  describeRoute({
    tags: ["Agent"],
    responses: {
      200: {
        description: "Agent run result",
        content: {
          "application/json": {
            schema: resolver(AgentRunResultSchema),
          },
        },
      },
      400: {
        description: "入力値が不正",
        content: {
          "application/json": {
            schema: resolver(ErrorSchema),
          },
        },
      },
      500: {
        description: "Agent 実行エラー",
        content: {
          "application/json": {
            schema: resolver(ErrorSchema),
          },
        },
      },
    },
  }),
  validator("json", AgentRunInputSchema),
  async (c) => {
    const input = c.req.valid("json");
    const context = createWorkflowContext();
    const result = await runAgent(input, context).catch((err: unknown) => {
      if (err instanceof AgentConfigurationError) {
        throw new AppError(err.code, err.message, 500);
      }
      throw err;
    });

    return c.json(result);
  },
);
