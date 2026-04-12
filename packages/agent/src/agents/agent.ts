import {
  convertToModelMessages,
  consumeStream,
  generateText,
  stepCountIs,
  streamText,
  type UIMessage,
  type UIMessageStreamOnFinishCallback,
} from "ai";
import { buildAgentSystemPrompt } from "../prompts/agent.js";
import { triageTool } from "../tools/triage.js";
import { reportDraftTool } from "../tools/report-draft.js";
import { xlsxParseTool } from "../tools/xlsx-parse.js";
import { pdfParseTool } from "../tools/pdf-parse.js";
import { xlsxCreateTool } from "../tools/xlsx-create.js";
import type {
  AgentChatInput,
  AgentRunInput,
  AgentRunResult,
  AgentToolTrace,
  AgentWorkflowResult,
  StreamAgentChatInput,
} from "../types.js";
import { getConfiguredModel } from "../providers/index.js";
import type { WorkflowContext } from "@dx-template/workflow";

export interface RunAgentOptions {
  runId?: string;
  model?: string;
}

export async function runAgent(
  input: AgentRunInput,
  context: WorkflowContext,
  options: RunAgentOptions = {},
): Promise<AgentRunResult> {
  const runId = options.runId ?? crypto.randomUUID();
  let workflow: AgentRunResult["workflow"] | undefined;
  let workflowResult: AgentWorkflowResult | undefined;
  const toolTrace: AgentToolTrace[] = [];

  const { text } = await generateText({
    model: getConfiguredModel({ model: options.model }),
    system: buildAgentSystemPrompt(input.source, input.actor),
    prompt: input.message,
    tools: createTools(context, {
      message: input.message,
      setWorkflow: (w, r) => {
        workflow = w;
        workflowResult = r;
      },
      toolTrace,
    }),
    stopWhen: stepCountIs(5),
  });

  if (!workflow || !workflowResult) {
    throw new Error("Agent did not dispatch a workflow");
  }

  return { runId, workflow, message: text, result: workflowResult, trace: { tools: toolTrace } };
}

export interface StreamAgentChatOptions {
  onFinish?: UIMessageStreamOnFinishCallback<UIMessage>;
}

export async function streamAgentChat(
  input: StreamAgentChatInput,
  context: WorkflowContext,
  options: StreamAgentChatOptions = {},
): Promise<Response> {
  const message = getLatestUserMessageText(input.messages);

  const result = await streamText({
    model: getConfiguredModel({ model: input.model, provider: input.provider }),
    system: buildAgentSystemPrompt(input.source, input.actor),
    messages: await convertToModelMessages(input.messages as UIMessage[]),
    tools: createTools(context, { message, setWorkflow: () => {}, toolTrace: [] }),
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: input.messages as UIMessage[],
    onError: (error) => (error instanceof Error ? error.message : String(error)),
    onFinish: options.onFinish,
    consumeSseStream: consumeStream,
  });
}

function createTools(
  context: WorkflowContext,
  state: {
    message: string;
    setWorkflow: (workflow: AgentRunResult["workflow"], result: AgentWorkflowResult) => void;
    toolTrace: AgentToolTrace[];
  },
) {
  return {
    runTriage: triageTool({
      message: state.message,
      setWorkflow: state.setWorkflow,
      toolTrace: state.toolTrace,
    }),
    createReportDraft: reportDraftTool({
      message: state.message,
      setWorkflow: state.setWorkflow,
      toolTrace: state.toolTrace,
    }),
    parseXlsx: xlsxParseTool(context, {
      message: state.message,
      setWorkflow: state.setWorkflow,
      toolTrace: state.toolTrace,
    }),
    parsePdf: pdfParseTool(context, {
      message: state.message,
      setWorkflow: state.setWorkflow,
      toolTrace: state.toolTrace,
    }),
    createXlsx: xlsxCreateTool(context, {
      message: state.message,
      setWorkflow: state.setWorkflow,
      toolTrace: state.toolTrace,
    }),
  };
}

function getLatestUserMessageText(messages: AgentChatInput["messages"]): string {
  const latestUserMessage = messages.findLast((message) => message.role === "user");
  const text = latestUserMessage?.parts
    .filter(
      (part): part is { type: "text"; text: string } =>
        part.type === "text" && typeof part["text"] === "string",
    )
    .map((part) => part.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Chat request does not contain a user text message");
  }
  return text;
}
