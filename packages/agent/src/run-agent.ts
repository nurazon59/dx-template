import { generateText, stepCountIs, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import {
  type ReportDraftWorkflowPayload,
  TriageIntentSchema,
  type TriageWorkflowPayload,
  type WorkflowContext,
  workflowRegistry,
} from "@dx-template/workflow";
import type {
  AgentRunInput,
  AgentRunResult,
  AgentToolTrace,
  AgentWorkflowResult,
} from "./types.js";

const TriageToolInputSchema = z.object({
  intent: TriageIntentSchema,
  summary: z.string(),
});

const ReportDraftToolInputSchema = z.object({
  title: z.string(),
  summary: z.string(),
  audience: z.string().default("事業企画部"),
});

export class AgentConfigurationError extends Error {
  constructor(
    public readonly code: "OPENAI_MODEL_NOT_CONFIGURED" | "OPENAI_API_KEY_NOT_CONFIGURED",
    message: string,
  ) {
    super(message);
    this.name = "AgentConfigurationError";
  }
}

export interface RunAgentOptions {
  runId?: string;
}

function shouldCreateReportDraft(message: string): boolean {
  return /report|レポート|報告|草案/i.test(message);
}

async function runMockAgent(
  input: AgentRunInput,
  context: WorkflowContext,
  options: RunAgentOptions,
): Promise<AgentRunResult> {
  const runId = options.runId ?? crypto.randomUUID();
  const toolTrace: AgentToolTrace[] = [];
  const intent = shouldCreateReportDraft(input.message) ? "report" : "general";
  const triagePayload: TriageWorkflowPayload = {
    message: input.message,
    intent,
    summary: input.message,
  };
  const triageResult = await workflowRegistry.triage.run(triagePayload, context);
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
      trace: {
        tools: toolTrace,
      },
    };
  }

  const reportDraftPayload: ReportDraftWorkflowPayload = {
    message: input.message,
    title: "レポート草案",
    summary: input.message,
    audience: "事業企画部",
  };
  const reportDraftResult = await workflowRegistry.reportDraft.run(reportDraftPayload, context);
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
    trace: {
      tools: toolTrace,
    },
  };
}

export async function runAgent(
  input: AgentRunInput,
  context: WorkflowContext,
  options: RunAgentOptions = {},
): Promise<AgentRunResult> {
  if (process.env["AI_AGENT_MODE"] === "mock") {
    return runMockAgent(input, context, options);
  }

  const modelName = process.env["OPENAI_MODEL"];
  if (!modelName) {
    throw new AgentConfigurationError("OPENAI_MODEL_NOT_CONFIGURED", "OPENAI_MODEL is not set");
  }
  if (!process.env["OPENAI_API_KEY"]) {
    throw new AgentConfigurationError("OPENAI_API_KEY_NOT_CONFIGURED", "OPENAI_API_KEY is not set");
  }

  const runId = options.runId ?? crypto.randomUUID();
  let workflow: AgentRunResult["workflow"] | undefined;
  let workflowResult: AgentWorkflowResult | undefined;
  const toolTrace: AgentToolTrace[] = [];

  const { text } = await generateText({
    model: openai(modelName),
    system: [
      "あなたは事業企画部向け工数削減ツールの Agent です。",
      "責務はユーザーの意図を理解し、適切な workflow 起動口を選ぶことだけです。",
      "現在利用できる workflow は triage と reportDraft です。",
      "必ず runTriage tool を一度呼び出してください。",
      "レポート作成やレポート草案の依頼なら、runTriage の後に createReportDraft tool を呼び出してください。",
    ].join("\n"),
    prompt: [
      `source: ${input.source}`,
      input.actor?.userId ? `userId: ${input.actor.userId}` : undefined,
      input.actor?.slackUserId ? `slackUserId: ${input.actor.slackUserId}` : undefined,
      `message: ${input.message}`,
    ]
      .filter(Boolean)
      .join("\n"),
    tools: {
      runTriage: tool({
        description: "ユーザー入力を triage workflow に渡し、初期 intent と summary を返す。",
        inputSchema: TriageToolInputSchema,
        execute: async ({ intent, summary }) => {
          const payload: TriageWorkflowPayload = {
            message: input.message,
            intent,
            summary,
          };
          const result = await workflowRegistry.triage.run(payload, context);
          workflow = "triage";
          workflowResult = result;
          toolTrace.push({
            toolName: "runTriage",
            workflow: "triage",
            input: payload,
            output: result,
          });
          return result;
        },
      }),
      createReportDraft: tool({
        description:
          "レポート作成やレポート草案の依頼に対して、transport 非依存の report draft を作る。",
        inputSchema: ReportDraftToolInputSchema,
        execute: async ({ title, summary, audience }) => {
          const payload: ReportDraftWorkflowPayload = {
            message: input.message,
            title,
            summary,
            audience,
          };
          const result = await workflowRegistry.reportDraft.run(payload, context);
          workflow = "reportDraft";
          workflowResult = result;
          toolTrace.push({
            toolName: "createReportDraft",
            workflow: "reportDraft",
            input: payload,
            output: result,
          });
          return result;
        },
      }),
    },
    stopWhen: stepCountIs(5),
  });

  if (!workflow || !workflowResult) {
    throw new Error("Agent did not dispatch a workflow");
  }

  return {
    runId,
    workflow,
    message: text,
    result: workflowResult,
    trace: {
      tools: toolTrace,
    },
  };
}
