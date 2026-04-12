import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
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
  AgentChatInput,
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

export interface StreamAgentChatInput extends AgentChatInput {
  actor?: AgentRunInput["actor"];
  source: AgentRunInput["source"];
}

const AGENT_SYSTEM_PROMPT = [
  "あなたは事業企画部向け工数削減ツールの Agent です。",
  "責務はユーザーの意図を理解し、適切な workflow 起動口を選ぶことだけです。",
  "現在利用できる workflow は triage と reportDraft です。",
  "必ず runTriage tool を一度呼び出してください。",
  "レポート作成やレポート草案の依頼なら、runTriage の後に createReportDraft tool を呼び出してください。",
].join("\n");

function shouldCreateReportDraft(message: string): boolean {
  return /report|レポート|報告|草案/i.test(message);
}

function getConfiguredModel() {
  const modelName = process.env["OPENAI_MODEL"];
  if (!modelName) {
    throw new AgentConfigurationError("OPENAI_MODEL_NOT_CONFIGURED", "OPENAI_MODEL is not set");
  }
  if (!process.env["OPENAI_API_KEY"]) {
    throw new AgentConfigurationError("OPENAI_API_KEY_NOT_CONFIGURED", "OPENAI_API_KEY is not set");
  }
  return openai(modelName);
}

function createAgentTools(
  input: AgentRunInput,
  context: WorkflowContext,
  state: {
    setWorkflow: (workflow: AgentRunResult["workflow"], result: AgentWorkflowResult) => void;
    toolTrace: AgentToolTrace[];
  },
) {
  return {
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
        state.setWorkflow("triage", result);
        state.toolTrace.push({
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
        state.setWorkflow("reportDraft", result);
        state.toolTrace.push({
          toolName: "createReportDraft",
          workflow: "reportDraft",
          input: payload,
          output: result,
        });
        return result;
      },
    }),
  };
}

function getLatestUserMessageText(messages: AgentChatInput["messages"]): string {
  const latestUserMessage = messages.findLast((message) => message.role === "user");
  const text = latestUserMessage?.parts
    .filter((part): part is { type: "text"; text: string } => {
      return part.type === "text" && typeof part["text"] === "string";
    })
    .map((part) => part.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Chat request does not contain a user text message");
  }
  return text;
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

  const runId = options.runId ?? crypto.randomUUID();
  let workflow: AgentRunResult["workflow"] | undefined;
  let workflowResult: AgentWorkflowResult | undefined;
  const toolTrace: AgentToolTrace[] = [];

  const { text } = await generateText({
    model: getConfiguredModel(),
    system: AGENT_SYSTEM_PROMPT,
    prompt: [
      `source: ${input.source}`,
      input.actor?.userId ? `userId: ${input.actor.userId}` : undefined,
      input.actor?.slackUserId ? `slackUserId: ${input.actor.slackUserId}` : undefined,
      `message: ${input.message}`,
    ]
      .filter(Boolean)
      .join("\n"),
    tools: createAgentTools(input, context, {
      setWorkflow: (nextWorkflow, nextResult) => {
        workflow = nextWorkflow;
        workflowResult = nextResult;
      },
      toolTrace,
    }),
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

export async function streamAgentChat(
  input: StreamAgentChatInput,
  context: WorkflowContext,
): Promise<Response> {
  const message = getLatestUserMessageText(input.messages);
  const runInput: AgentRunInput = {
    message,
    actor: input.actor,
    source: input.source,
  };

  if (process.env["AI_AGENT_MODE"] === "mock") {
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const result = await runMockAgent(runInput, context, {});
        const textPartId = result.runId;
        writer.write({ type: "start" });
        writer.write({ type: "text-start", id: textPartId });
        writer.write({ type: "text-delta", id: textPartId, delta: result.message });
        writer.write({ type: "text-end", id: textPartId });
        writer.write({ type: "finish", finishReason: "stop" });
      },
      onError: (error) => (error instanceof Error ? error.message : String(error)),
    });
    return createUIMessageStreamResponse({ stream });
  }

  const toolTrace: AgentToolTrace[] = [];
  const result = streamText({
    model: getConfiguredModel(),
    system: [
      AGENT_SYSTEM_PROMPT,
      `source: ${input.source}`,
      input.actor?.userId ? `userId: ${input.actor.userId}` : undefined,
      input.actor?.slackUserId ? `slackUserId: ${input.actor.slackUserId}` : undefined,
    ]
      .filter(Boolean)
      .join("\n"),
    messages: await convertToModelMessages(input.messages as UIMessage[]),
    tools: createAgentTools(runInput, context, {
      setWorkflow: () => {},
      toolTrace,
    }),
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => (error instanceof Error ? error.message : String(error)),
  });
}
