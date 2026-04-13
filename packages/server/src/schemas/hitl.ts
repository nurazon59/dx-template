import { z } from "zod";

export const ResumeApprovalInputSchema = z
  .object({
    approved: z.boolean(),
    reason: z.string().optional(),
  })
  .meta({ ref: "ResumeApprovalInput" });

export const PendingApprovalResponseSchema = z
  .object({
    jobId: z.string(),
    approvalId: z.string(),
    toolName: z.string(),
    toolArgs: z.unknown(),
    createdAt: z.string().datetime(),
  })
  .meta({ ref: "PendingApprovalResponse" });
