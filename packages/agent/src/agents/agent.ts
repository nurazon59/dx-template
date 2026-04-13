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
import type { Memory } from "../prompts/agent.js";
import { triageTool } from "../tools/triage.js";
import { reportDraftTool } from "../tools/report-draft.js";
import { xlsxParseTool } from "../tools/xlsx-parse.js";
import { pdfParseTool } from "../tools/pdf-parse.js";
import { xlsxCreateTool } from "../tools/xlsx-create.js";
import { chartCreateTool } from "../tools/chart-create.js";
import { fileSearchTool } from "../tools/file-search.js";
import { saveMemoryTool, type SaveMemoryFn } from "../tools/save-memory.js";
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

export interface AgentContext {
  workflow: WorkflowContext;
  memories?: Memory[];
  saveMemory?: SaveMemoryFn;
}

export interface RunAgentOptions {
  runId?: string;
  model?: string;
}

export async function runAgent(
  input: AgentRunInput,
  context: WorkflowContext | AgentContext,
  options: RunAgentOptions = {},
): Promise<AgentRunResult> {
  const runId = options.runId ?? crypto.randomUUID();
  const agentCtx = "workflow" in context ? context : { workflow: context };
  let workflow: AgentRunResult["workflow"] | undefined;
  let workflowResult: AgentWorkflowResult | undefined;
  const toolTrace: AgentToolTrace[] = [];

  const { text } = await generateText({
    model: getConfiguredModel({ model: options.model }),
    system: buildAgentSystemPrompt(input.source, input.actor, agentCtx.memories),
    prompt: input.message,
    tools: createTools(agentCtx, {
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
  context: WorkflowContext | AgentContext,
  options: StreamAgentChatOptions = {},
): Promise<Response> {
  const message = getLatestUserMessageText(input.messages);
  const agentCtx = "workflow" in context ? context : { workflow: context };

  const result = await streamText({
    model: getConfiguredModel({ model: input.model, provider: input.provider }),
    system: buildAgentSystemPrompt(input.source, input.actor, agentCtx.memories),
    messages: await convertToModelMessages(input.messages as UIMessage[]),
    tools: createTools(agentCtx, { message, setWorkflow: () => {}, toolTrace: [] }),
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
  context: AgentContext,
  state: {
    message: string;
    setWorkflow: (workflow: AgentRunResult["workflow"], result: AgentWorkflowResult) => void;
    toolTrace: AgentToolTrace[];
  },
) {
  const baseTools = {
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
    parseXlsx: xlsxParseTool(context.workflow, {
      message: state.message,
      setWorkflow: state.setWorkflow,
      toolTrace: state.toolTrace,
    }),
    parsePdf: pdfParseTool(context.workflow, {
      message: state.message,
      setWorkflow: state.setWorkflow,
      toolTrace: state.toolTrace,
    }),
    createXlsx: xlsxCreateTool(context.workflow, {
      message: state.message,
      setWorkflow: state.setWorkflow,
      toolTrace: state.toolTrace,
    }),
    createChart: chartCreateTool(context.workflow, {
      message: state.message,
      setWorkflow: state.setWorkflow,
      toolTrace: state.toolTrace,
    }),
    searchFiles: fileSearchTool(context.workflow, {
      toolTrace: state.toolTrace,
    }),
  };

  if (context.saveMemory) {
    return {
      ...baseTools,
      saveMemory: saveMemoryTool(context.saveMemory, {
        toolTrace: state.toolTrace,
      }),
    };
  }

  return baseTools;
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
