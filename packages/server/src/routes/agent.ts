import {
  AgentConfigurationError,
  runAgent,
  streamAgentChat,
  AgentChatInputSchema,
  AgentRunInputSchema,
  AgentRunResultSchema,
  type AgentContext,
  type AgentPendingResult,
} from "@dx-template/agent";
import { jobStore } from "@dx-template/workflow";
import * as agentRunsRepo from "../repositories/agent-runs.js";
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
import {
  AgentRunSummarySchema,
  AgentRunRowSchema,
  ToolUsageSchema,
  DailyStatSchema,
} from "../schemas/agent-runs.js";
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
      try {
        const result = await runAgent(
          {
            ...input,
            actor: {
              ...input.actor,
              userId: user.id,
            },
          },
          agentContext,
        );

        if ("pendingApproval" in result) {
          const pending = result as AgentPendingResult;
          const jobId = crypto.randomUUID();
          jobStore.create({
            jobId,
            workflowType: "agent-hitl",
            status: "running",
            currentStep: "pending-approval",
            payload: input,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          jobStore.setPendingApproval(jobId, pending.pendingApproval);
          return c.json({ ...pending, jobId });
        }

        await agentRunsRepo.insert(c.var.db, {
          userId: user.id,
          source: input.source,
          model: result.metrics.model,
          inputTokens: result.metrics.inputTokens,
          outputTokens: result.metrics.outputTokens,
          totalTokens: result.metrics.totalTokens,
          durationMs: result.metrics.durationMs,
          stepCount: result.metrics.stepCount,
          toolTrace: result.trace.tools,
          isError: false,
        });

        return c.json(result);
      } catch (err) {
        if (err instanceof AgentConfigurationError) {
          throw new AppError(err.code, err.message, 500);
        }

        await agentRunsRepo.insert(c.var.db, {
          userId: user.id,
          source: input.source,
          model: "unknown",
          isError: true,
          errorMessage: err instanceof Error ? err.message : String(err),
        });

        throw err;
      }
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
            onMetrics: async (metrics, toolTrace) => {
              await agentRunsRepo.insert(c.var.db, {
                conversationId,
                userId: user.id,
                source: "web",
                model: metrics.model,
                provider: input.provider ?? null,
                inputTokens: metrics.inputTokens,
                outputTokens: metrics.outputTokens,
                totalTokens: metrics.totalTokens,
                durationMs: metrics.durationMs,
                stepCount: metrics.stepCount,
                toolTrace,
                isError: false,
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
  )
  .get(
    "/metrics/summary",
    describeRoute({
      tags: ["Agent"],
      responses: {
        200: {
          description: "メトリクスサマリー",
          content: {
            "application/json": {
              schema: resolver(AgentRunSummarySchema),
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
      const from = c.req.query("from") ? new Date(c.req.query("from")!) : undefined;
      const to = c.req.query("to") ? new Date(c.req.query("to")!) : undefined;
      const summary = await agentRunsRepo.getSummary(c.var.db, { from, to });
      return c.json(summary);
    },
  )
  .get(
    "/metrics/runs",
    describeRoute({
      tags: ["Agent"],
      responses: {
        200: {
          description: "直近の実行一覧",
          content: {
            "application/json": {
              schema: resolver(z.object({ runs: z.array(AgentRunRowSchema) })),
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
      const limit = Number(c.req.query("limit") ?? "20");
      const offset = Number(c.req.query("offset") ?? "0");
      const runs = await agentRunsRepo.listRecent(c.var.db, { limit, offset });
      return c.json({ runs });
    },
  )
  .get(
    "/metrics/tool-usage",
    describeRoute({
      tags: ["Agent"],
      responses: {
        200: {
          description: "ツール別使用回数",
          content: {
            "application/json": {
              schema: resolver(z.object({ tools: z.array(ToolUsageSchema) })),
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
      const from = c.req.query("from") ? new Date(c.req.query("from")!) : undefined;
      const to = c.req.query("to") ? new Date(c.req.query("to")!) : undefined;
      const rows = await agentRunsRepo.getToolUsage(c.var.db, { from, to });
      const tools = rows.map((r) => ({ toolName: r.tool_name, usageCount: r.usage_count }));
      return c.json({ tools });
    },
  )
  .get(
    "/metrics/daily",
    describeRoute({
      tags: ["Agent"],
      responses: {
        200: {
          description: "日別統計",
          content: {
            "application/json": {
              schema: resolver(z.object({ stats: z.array(DailyStatSchema) })),
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
      const from = c.req.query("from") ? new Date(c.req.query("from")!) : undefined;
      const to = c.req.query("to") ? new Date(c.req.query("to")!) : undefined;
      const stats = await agentRunsRepo.getDailyStats(c.var.db, { from, to });
      return c.json({ stats });
    },
  );
