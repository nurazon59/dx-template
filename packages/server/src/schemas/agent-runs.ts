import { z } from "zod";

export const AgentRunSummarySchema = z
  .object({
    totalRuns: z.number(),
    totalInputTokens: z.number(),
    totalOutputTokens: z.number(),
    totalTokens: z.number(),
    avgDurationMs: z.number(),
    errorCount: z.number(),
  })
  .meta({ ref: "AgentRunSummary" });

export const AgentRunRowSchema = z
  .object({
    id: z.string().uuid(),
    conversationId: z.string().uuid().nullable(),
    userId: z.string().nullable(),
    source: z.string(),
    model: z.string(),
    provider: z.string().nullable(),
    inputTokens: z.number(),
    outputTokens: z.number(),
    totalTokens: z.number(),
    durationMs: z.number(),
    stepCount: z.number(),
    toolTrace: z
      .array(
        z.object({
          toolName: z.string(),
          workflow: z.string(),
          input: z.unknown(),
          output: z.unknown(),
        }),
      )
      .nullable(),
    isError: z.boolean(),
    errorMessage: z.string().nullable(),
    finishedAt: z.string(),
  })
  .meta({ ref: "AgentRunRow" });

export const ToolUsageSchema = z
  .object({
    toolName: z.string(),
    usageCount: z.number(),
  })
  .meta({ ref: "ToolUsage" });

export const DailyStatSchema = z
  .object({
    date: z.string(),
    runs: z.number(),
    totalTokens: z.number(),
    errorCount: z.number(),
  })
  .meta({ ref: "DailyStat" });
