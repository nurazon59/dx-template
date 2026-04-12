import type { WorkflowContext } from "./types.js";
import { jobStore } from "./runner.js";
import { triageWorkflow } from "./workflows/triage.js";
import { reportWorkflow } from "./workflows/report.js";
import { xlsxParseWorkflow } from "./workflows/xlsx-parse.js";
import { pdfParseWorkflow } from "./workflows/pdf-parse.js";

export { jobStore };

export const workflowRegistry = {
  triage: triageWorkflow,
  report: reportWorkflow,
  xlsxParse: xlsxParseWorkflow,
  pdfParse: pdfParseWorkflow,
};

export type WorkflowType = keyof typeof workflowRegistry;

export const dispatch = async (
  type: WorkflowType,
  payload: unknown,
  context?: WorkflowContext,
): Promise<{ jobId: string }> => {
  const jobId = crypto.randomUUID();
  jobStore.create({
    jobId,
    workflowType: type,
    status: "running",
    currentStep: "",
    payload,
  });
  const workflow = workflowRegistry[type];
  await (
    workflow.run as (jobId: string, payload: unknown, context?: WorkflowContext) => Promise<unknown>
  )(jobId, payload, context);
  return { jobId };
};

export const resume = async (
  jobId: string,
  input?: unknown,
  context?: WorkflowContext,
): Promise<{ jobId: string }> => {
  const job = jobStore.get(jobId);
  if (!job || job.status !== "suspended") {
    throw new Error(`Job ${jobId} is not suspended`);
  }
  if (input && job.suspendedCtx && typeof job.suspendedCtx === "object") {
    job.suspendedCtx = { ...job.suspendedCtx, ...input };
  }
  job.status = "running";
  const workflow = workflowRegistry[job.workflowType as WorkflowType];
  await (
    workflow.run as (jobId: string, payload: unknown, context?: WorkflowContext) => Promise<unknown>
  )(jobId, job.payload, context);
  return { jobId };
};
