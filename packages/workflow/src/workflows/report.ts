import { z } from "zod";
import type { Workflow } from "../types.js";
import { jobStore } from "../runner.js";

export const ReportDraftWorkflowPayloadSchema = z.object({
  message: z.string(),
  title: z.string(),
  summary: z.string(),
  audience: z.string().default("事業企画部"),
});
export type ReportDraftWorkflowPayload = z.infer<typeof ReportDraftWorkflowPayloadSchema>;

export const ReportDraftWorkflowResultSchema = z.object({
  kind: z.literal("reportDraft"),
  title: z.string(),
  audience: z.string(),
  summary: z.string(),
  outline: z.array(z.string()),
  draft: z.string(),
  nextAction: z.string(),
});
export type ReportDraftWorkflowResult = z.infer<typeof ReportDraftWorkflowResultSchema>;

export const reportWorkflow: Workflow<ReportDraftWorkflowPayload, ReportDraftWorkflowResult> = {
  run: async (jobId, payload) => {
    jobStore.updateStep(jobId, "prepare");
    const outlined = { ...payload, outline: ["目的", "現状", "論点", "次アクション"] };

    jobStore.updateStep(jobId, "generate");
    const draft = [
      `# ${payload.title}`,
      "",
      `対象: ${payload.audience}`,
      "",
      "## 概要",
      payload.summary,
      "",
      "## 次アクション",
      "必要なデータソースと提出形式を確認して、レポート本文を具体化します。",
    ].join("\n");

    const result: ReportDraftWorkflowResult = {
      kind: "reportDraft",
      title: payload.title,
      audience: payload.audience,
      summary: payload.summary,
      outline: outlined.outline,
      draft,
      nextAction: "必要なデータソース、提出形式、締切を確認します。",
    };

    jobStore.complete(jobId, result);
    return result;
  },
};
