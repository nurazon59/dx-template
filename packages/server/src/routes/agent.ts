import {
  AgentConfigurationError,
  runAgent,
  streamAgentChat,
  AgentChatInputSchema,
  AgentRunInputSchema,
  AgentRunResultSchema,
} from "@dx-template/agent";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { WorkflowContext } from "@dx-template/workflow";
import { z } from "zod";
import type { Env } from "../lib/context.js";
import { AppError } from "../lib/errors.js";
import { requireAuth } from "../middleware/auth.js";
import { ErrorSchema } from "../schemas/error.js";

function createWorkflowContext(): WorkflowContext {
  return {
    queries: {},
  };
}

export const agentRoute = new Hono<Env>()
  .post(
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
        401: {
          description: "未認証",
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
    requireAuth,
    validator("json", AgentRunInputSchema),
    async (c) => {
      const input = c.req.valid("json");
      const user = c.get("user")!;
      const context = createWorkflowContext();
      const result = await runAgent(
        {
          ...input,
          actor: {
            ...input.actor,
            userId: user.id,
          },
        },
        context,
      ).catch((err: unknown) => {
        if (err instanceof AgentConfigurationError) {
          throw new AppError(err.code, err.message, 500);
        }
        throw err;
      });

      return c.json(result);
    },
  )
  .post(
    "/chat",
    describeRoute({
      tags: ["Agent"],
      responses: {
        200: {
          description: "Agent chat stream",
          content: {
            "text/event-stream": {
              schema: resolver(z.string()),
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
        401: {
          description: "未認証",
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
    requireAuth,
    validator("json", AgentChatInputSchema),
    async (c) => {
      const input = c.req.valid("json");
      const user = c.get("user")!;
      const context = createWorkflowContext();

      try {
        return await streamAgentChat(
          {
            messages: input.messages,
            model: input.model,
            provider: input.provider,
            actor: {
              userId: user.id,
            },
            source: "web",
          },
          context,
        );
      } catch (err) {
        if (err instanceof AgentConfigurationError) {
          throw new AppError(err.code, err.message, 500);
        }
        throw err;
      }
    },
  );
