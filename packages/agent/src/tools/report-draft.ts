import { tool } from "ai";
import { z } from "zod";
import {
  type ReportDraftWorkflowPayload,
  type ReportDraftWorkflowResult,
  dispatch,
  jobStore,
} from "@dx-template/workflow";

export const ReportDraftToolInputSchema = z.object({
  title: z.string(),
  summary: z.string(),
  audience: z.string().default("事業企画部"),
});

export const reportDraftTool = (state: { message: string }) =>
  tool({
    description:
      "レポート作成やレポート草案の依頼に対して、transport 非依存の report draft を作る。",
    inputSchema: ReportDraftToolInputSchema,
    execute: async ({ title, summary, audience }) => {
      const payload: ReportDraftWorkflowPayload = {
        message: state.message,
        title,
        summary,
        audience,
      };
      const { jobId } = await dispatch("report", payload);
      const job = jobStore.get(jobId);
      const result = job?.result as ReportDraftWorkflowResult;
      return { workflow: "reportDraft" as const, ...result };
    },
  });
