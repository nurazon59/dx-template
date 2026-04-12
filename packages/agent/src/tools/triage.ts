import { tool } from "ai";
import { z } from "zod";
import {
  TriageIntentSchema,
  type TriageWorkflowPayload,
  type WorkflowContext,
  workflowRegistry,
} from "@dx-template/workflow";
import type { AgentRunResult, AgentToolTrace, AgentWorkflowResult } from "../types.js";

type SetWorkflow = (workflow: AgentRunResult["workflow"], result: AgentWorkflowResult) => void;

export const TriageToolInputSchema = z.object({
  intent: TriageIntentSchema,
  summary: z.string(),
});

export const triageTool = (
  context: WorkflowContext,
  state: { message: string; setWorkflow: SetWorkflow; toolTrace: AgentToolTrace[] },
) =>
  tool({
    description: "ユーザー入力を triage workflow に渡し、初期 intent と summary を返す。",
    inputSchema: TriageToolInputSchema,
    execute: async ({ intent, summary }) => {
      const payload: TriageWorkflowPayload = { message: state.message, intent, summary };
      const result = await workflowRegistry.triage.run(payload, context);
      state.setWorkflow("triage", result);
      state.toolTrace.push({
        toolName: "runTriage",
        workflow: "triage",
        input: payload,
        output: result,
      });
      return result;
    },
  });
