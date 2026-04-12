import { z } from "zod";
import type { StepEntry, Workflow } from "../types.js";
import { createRunner } from "../runner.js";

export const TriageIntentSchema = z.enum(["report", "approval", "general", "unknown"]);
export type TriageIntent = z.infer<typeof TriageIntentSchema>;

export const TriageWorkflowPayloadSchema = z.object({
  message: z.string(),
  intent: TriageIntentSchema,
  summary: z.string(),
});
export type TriageWorkflowPayload = z.infer<typeof TriageWorkflowPayloadSchema>;

export const TriageWorkflowResultSchema = z.object({
  kind: z.literal("triage"),
  intent: TriageIntentSchema,
  summary: z.string(),
  nextAction: z.string(),
});
export type TriageWorkflowResult = z.infer<typeof TriageWorkflowResultSchema>;

function nextActionFor(intent: TriageIntent): string {
  switch (intent) {
    case "report":
      return "report workflow の要件が固まったら、入力収集とレポート生成に進みます。";
    case "approval":
      return "approval workflow の要件が固まったら、承認依頼の作成に進みます。";
    case "general":
      return "追加の業務要件を確認して、対応する workflow に接続します。";
    case "unknown":
      return "意図を特定するために、目的と期待する成果物を確認します。";
  }
}

const steps: StepEntry[] = [
  {
    name: "classify",
    execute: async (payload: unknown) => {
      const p = payload as TriageWorkflowPayload;
      return {
        kind: "triage" as const,
        intent: p.intent,
        summary: p.summary,
        nextAction: nextActionFor(p.intent),
      };
    },
  },
];

export const triageWorkflow: Workflow<TriageWorkflowPayload, TriageWorkflowResult> = {
  run: createRunner<TriageWorkflowPayload, TriageWorkflowResult>(steps),
};
