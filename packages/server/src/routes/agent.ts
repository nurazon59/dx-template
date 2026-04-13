import {
  AgentConfigurationError,
  runAgent,
  streamAgentChat,
  AgentChatInputSchema,
  AgentRunInputSchema,
  AgentRunResultSchema,
  type AgentContext,
} from "@dx-template/agent";
import * as memoriesRepo from "../repositories/memories.js";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { z } from "zod";
import type { Env } from "../lib/context.js";
import { AppError } from "../lib/errors.js";
import { requireAuth } from "../middleware/auth.js";
import {
  type AgentUiMessage,
  ensureConversation,
  findConversation,
  listConversations,
  replaceConversationMessages,
} from "../repositories/agent-conversations.js";
import { AgentConversationSchema, AgentConversationSummarySchema } from "../schemas/agent.js";
import { ErrorSchema } from "../schemas/error.js";
import { createWorkflowContext } from "../lib/workflow-context-factory.js";

export const agentRoute = new Hono<Env>()
  .get(
    "/conversations",
    describeRoute({
      tags: ["Agent"],
      responses: {
        200: {
          description: "Agent conversation list",
          content: {
            "application/json": {
              schema: resolver(
                z.object({ conversations: z.array(AgentConversationSummarySchema) }),
              ),
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
    async (c) => {
      const user = c.get("user")!;
      const conversations = await listConversations(c.var.db, user.id);
      return c.json({ conversations });
    },
  )
  .get(
    "/conversations/:conversationId",
    describeRoute({
      tags: ["Agent"],
      responses: {
        200: {
          description: "Agent conversation",
          content: {
            "application/json": {
              schema: resolver(z.object({ conversation: AgentConversationSchema })),
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
        404: {
          description: "会話が見つからない",
          content: {
            "application/json": {
              schema: resolver(ErrorSchema),
            },
          },
        },
      },
    }),
    requireAuth,
    async (c) => {
      const user = c.get("user")!;
      const { conversationId } = c.req.param();
      const conversation = await findConversation(c.var.db, { conversationId, userId: user.id });
      if (!conversation) {
        throw new AppError("AGENT_CONVERSATION_NOT_FOUND", "Agent conversation not found", 404);
      }
      return c.json({ conversation });
    },
  )
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
      const workflow = createWorkflowContext({ db: c.var.db, userId: user.id });
      const memoryRows = await memoriesRepo.listAll(c.var.db);
      const agentContext: AgentContext = {
        workflow,
        memories: memoryRows.map((r) => ({ id: r.id, title: r.title, content: r.content })),
        saveMemory: async (input) => {
          const row = await memoriesRepo.insert(c.var.db, {
            ...input,
            source: "agent",
            createdBy: user.id,
          });
          return { id: row.id };
        },
      };
      const result = await runAgent(
        {
          ...input,
          actor: {
            ...input.actor,
            userId: user.id,
          },
        },
        agentContext,
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
      const conversationId = input.conversationId ?? crypto.randomUUID();
      const conversation = await ensureConversation(c.var.db, {
        conversationId,
        userId: user.id,
        messages: input.messages as AgentUiMessage[],
      });

      if (!conversation) {
        throw new AppError("AGENT_CONVERSATION_NOT_FOUND", "Agent conversation not found", 404);
      }

      try {
        const workflow = createWorkflowContext({ db: c.var.db, userId: user.id });
        const memoryRows = await memoriesRepo.listAll(c.var.db);
        const agentContext: AgentContext = {
          workflow,
          memories: memoryRows.map((r) => ({ id: r.id, title: r.title, content: r.content })),
          saveMemory: async (input) => {
            const row = await memoriesRepo.insert(c.var.db, {
              ...input,
              source: "agent",
              createdBy: user.id,
            });
            return { id: row.id };
          },
        };
        return await streamAgentChat(
          {
            conversationId,
            messages: input.messages,
            model: input.model,
            provider: input.provider,
            actor: {
              userId: user.id,
            },
            source: "web",
          },
          agentContext,
          {
            onFinish: async ({ messages }) => {
              await replaceConversationMessages(c.var.db, {
                conversationId,
                userId: user.id,
                messages: messages as AgentUiMessage[],
              });
            },
          },
        );
      } catch (err) {
        if (err instanceof AgentConfigurationError) {
          throw new AppError(err.code, err.message, 500);
        }
        throw err;
      }
    },
  );
