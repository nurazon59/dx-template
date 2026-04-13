import { z } from "zod";
import {
  ReportDraftWorkflowResultSchema,
  TriageWorkflowResultSchema,
  XlsxParseResultSchema,
  PdfParseResultSchema,
  XlsxCreateResultSchema,
  ChartCreateResultSchema,
} from "@dx-template/workflow";

export const AgentProviderSchema = z.enum(["openai", "google"]);
export type AgentProvider = z.infer<typeof AgentProviderSchema>;

export const AgentChatMessageSchema = z
  .object({
    id: z.string().optional(),
    role: z.enum(["system", "user", "assistant"]),
    parts: z.array(z.object({ type: z.string() }).passthrough()),
  })
  .passthrough();
export type AgentChatMessage = z.infer<typeof AgentChatMessageSchema>;

export const AgentChatInputSchema = z.object({
  conversationId: z.string().uuid().optional(),
  messages: z.array(AgentChatMessageSchema).min(1),
  provider: AgentProviderSchema.optional(),
  model: z.string().min(1).optional(),
});
export type AgentChatInput = z.infer<typeof AgentChatInputSchema>;

export const AgentRunInputSchema = z.object({
  message: z.string().min(1),
  actor: z
    .object({
      userId: z.string().optional(),
      slackUserId: z.string().optional(),
    })
    .optional(),
  source: z.enum(["web", "slack"]),
});
export type AgentRunInput = z.infer<typeof AgentRunInputSchema>;

export const AgentWorkflowResultSchema = z.union([
  TriageWorkflowResultSchema,
  ReportDraftWorkflowResultSchema,
  XlsxParseResultSchema,
  PdfParseResultSchema,
  XlsxCreateResultSchema,
  ChartCreateResultSchema,
]);
export type AgentWorkflowResult = z.infer<typeof AgentWorkflowResultSchema>;

export const AgentToolTraceSchema = z.object({
  toolName: z.enum([
    "runTriage",
    "createReportDraft",
    "parseXlsx",
    "parsePdf",
    "createXlsx",
    "createChart",
    "searchFiles",
    "saveMemory",
  ]),
  workflow: z.enum([
    "triage",
    "reportDraft",
    "xlsxParse",
    "pdfParse",
    "xlsxCreate",
    "chartCreate",
    "fileSearch",
    "saveMemory",
  ]),
  input: z.unknown(),
  output: z.unknown(),
});
export type AgentToolTrace = z.infer<typeof AgentToolTraceSchema>;

export const AgentRunResultSchema = z.object({
  runId: z.string(),
  workflow: z.enum(["triage", "reportDraft", "xlsxParse", "pdfParse", "xlsxCreate", "chartCreate"]),
  message: z.string(),
  result: AgentWorkflowResultSchema,
  trace: z.object({
    tools: z.array(AgentToolTraceSchema),
  }),
});
export type AgentRunResult = z.infer<typeof AgentRunResultSchema>;

export interface StreamAgentChatInput extends AgentChatInput {
  actor?: AgentRunInput["actor"];
  source: AgentRunInput["source"];
}
