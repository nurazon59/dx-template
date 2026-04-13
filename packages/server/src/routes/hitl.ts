import { resumeAgent, type AgentContext } from "@dx-template/agent";
import { jobStore } from "@dx-template/workflow";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { z } from "zod";
import type { Env } from "../lib/context.js";
import { AppError } from "../lib/errors.js";
import { requireAuth } from "../middleware/auth.js";
import * as memoriesRepo from "../repositories/memories.js";
import { PendingApprovalResponseSchema, ResumeApprovalInputSchema } from "../schemas/hitl.js";
import { ErrorSchema } from "../schemas/error.js";
import { createWorkflowContext } from "../lib/workflow-context-factory.js";

export const hitlRoute = new Hono<Env>()
  .get(
    "/pending",
    describeRoute({
      tags: ["HITL"],
      responses: {
        200: {
          description: "承認待ちジョブ一覧",
          content: {
            "application/json": {
              schema: resolver(z.object({ jobs: z.array(PendingApprovalResponseSchema) })),
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
      const pendingJobs = jobStore.listByStatus("pending-approval");
      const jobs = pendingJobs
        .filter((job) => job.pendingApproval)
        .map((job) => ({
          jobId: job.jobId,
          approvalId: job.pendingApproval!.approvalId,
          toolName: job.pendingApproval!.toolName,
          toolArgs: job.pendingApproval!.toolArgs,
          createdAt: job.updatedAt,
        }));
      return c.json({ jobs });
    },
  )
  .get(
    "/pending/:jobId",
    describeRoute({
      tags: ["HITL"],
      responses: {
        200: {
          description: "承認待ちジョブ詳細",
          content: {
            "application/json": {
              schema: resolver(PendingApprovalResponseSchema),
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
          description: "ジョブが見つからない",
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
      const { jobId } = c.req.param();
      const job = jobStore.get(jobId);
      if (!job || job.status !== "pending-approval" || !job.pendingApproval) {
        throw new AppError("HITL_JOB_NOT_FOUND", "Pending approval job not found", 404);
      }
      return c.json({
        jobId: job.jobId,
        approvalId: job.pendingApproval.approvalId,
        toolName: job.pendingApproval.toolName,
        toolArgs: job.pendingApproval.toolArgs,
        createdAt: job.updatedAt,
      });
    },
  )
  .post(
    "/pending/:jobId/resolve",
    describeRoute({
      tags: ["HITL"],
      responses: {
        200: {
          description: "承認/拒否の結果",
          content: {
            "application/json": {
              schema: resolver(z.object({ message: z.string() })),
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
        404: {
          description: "ジョブが見つからない",
          content: {
            "application/json": {
              schema: resolver(ErrorSchema),
            },
          },
        },
      },
    }),
    requireAuth,
    validator("json", ResumeApprovalInputSchema),
    async (c) => {
      const { jobId } = c.req.param();
      const input = c.req.valid("json");
      const user = c.get("user")!;

      const job = jobStore.get(jobId);
      if (!job || job.status !== "pending-approval" || !job.pendingApproval) {
        throw new AppError("HITL_JOB_NOT_FOUND", "Pending approval job not found", 404);
      }

      const { pendingApproval } = job;
      jobStore.clearPendingApproval(jobId);

      const workflow = createWorkflowContext({ db: c.var.db, userId: user.id });
      const memoryRows = await memoriesRepo.listAll(c.var.db);
      const agentContext: AgentContext = {
        workflow,
        memories: memoryRows.map((r) => ({ id: r.id, title: r.title, content: r.content })),
      };

      const result = await resumeAgent(
        {
          approvalId: pendingApproval.approvalId,
          approved: input.approved,
          reason: input.reason,
          previousMessages: pendingApproval.messages,
          source: "slack",
          actor: { userId: user.id },
        },
        agentContext,
      );

      jobStore.complete(jobId, result.result);

      return c.json(result);
    },
  );
