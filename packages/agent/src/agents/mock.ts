import {
  type ReportDraftWorkflowPayload,
  type ReportDraftWorkflowResult,
  type TriageWorkflowPayload,
  type TriageWorkflowResult,
  type WorkflowContext,
  dispatch,
  jobStore,
} from "@dx-template/workflow";
import type { AgentRunInput, AgentRunResult, AgentToolTrace } from "../types.js";

export async function runMockAgent(
  input: AgentRunInput,
  _context: WorkflowContext,
  runId: string,
): Promise<AgentRunResult> {
  const toolTrace: AgentToolTrace[] = [];
  const intent = /report|レポート|報告|草案/i.test(input.message) ? "report" : "general";

  const triagePayload: TriageWorkflowPayload = {
    message: input.message,
    intent,
    summary: input.message,
  };
  const { jobId: triageJobId } = await dispatch("triage", triagePayload);
  const triageResult = jobStore.get(triageJobId)?.result as TriageWorkflowResult;
  toolTrace.push({
    toolName: "runTriage",
    workflow: "triage",
    input: triagePayload,
    output: triageResult,
  });

  if (intent !== "report") {
    return {
      runId,
      workflow: "triage",
      message: "mock agent が triage workflow を起動しました。",
      result: triageResult,
      trace: { tools: toolTrace },
    };
  }

  const reportDraftPayload: ReportDraftWorkflowPayload = {
    message: input.message,
    title: "レポート草案",
    summary: input.message,
    audience: "事業企画部",
  };
  const { jobId: reportJobId } = await dispatch("report", reportDraftPayload);
  const reportDraftResult = jobStore.get(reportJobId)?.result as ReportDraftWorkflowResult;
  toolTrace.push({
    toolName: "createReportDraft",
    workflow: "reportDraft",
    input: reportDraftPayload,
    output: reportDraftResult,
  });

  return {
    runId,
    workflow: "reportDraft",
    message: "mock agent が reportDraft workflow を起動しました。",
    result: reportDraftResult,
    trace: { tools: toolTrace },
  };
}
