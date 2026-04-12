import { reportDraftWorkflow } from "./report-draft.js";
import { triageWorkflow } from "./triage.js";
import type { Workflow } from "./types.js";

export const workflowRegistry = {
  reportDraft: reportDraftWorkflow,
  triage: triageWorkflow,
} satisfies Record<string, Workflow<unknown, unknown>>;

export type WorkflowName = keyof typeof workflowRegistry;
