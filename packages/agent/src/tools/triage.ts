import { tool } from "ai";
import { z } from "zod";
import {
  TriageIntentSchema,
  type TriageWorkflowPayload,
  type TriageWorkflowResult,
  dispatch,
  jobStore,
} from "@dx-template/workflow";

export const TriageToolInputSchema = z.object({
  intent: TriageIntentSchema,
  summary: z.string(),
});

export const triageTool = (state: { message: string }) =>
  tool({
    description: "ユーザー入力を triage workflow に渡し、初期 intent と summary を返す。",
    inputSchema: TriageToolInputSchema,
    execute: async ({ intent, summary }) => {
      const payload: TriageWorkflowPayload = { message: state.message, intent, summary };
      const { jobId } = await dispatch("triage", payload);
      const job = jobStore.get(jobId);
      const result = job?.result as TriageWorkflowResult;
      return { workflow: "triage" as const, ...result };
    },
  });
