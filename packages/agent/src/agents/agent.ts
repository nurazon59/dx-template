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
  AgentRunMetrics,
  AgentRunResult,
  AgentToolTrace,
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

  const startTime = performance.now();

  const result = await generateText({
    model: getConfiguredModel({ model: options.model }),
    system: buildAgentSystemPrompt(input.source, input.actor, agentCtx.memories),
    prompt: input.message,
    tools: createTools(agentCtx, { message: input.message }),
    stopWhen: stepCountIs(5),
  });

  const durationMs = Math.round(performance.now() - startTime);

  return buildRunResult(runId, result as Parameters<typeof buildRunResult>[1], {
    inputTokens: result.totalUsage.inputTokens ?? 0,
    outputTokens: result.totalUsage.outputTokens ?? 0,
    totalTokens: result.totalUsage.totalTokens ?? 0,
    durationMs,
    stepCount: result.steps.length,
    model: options.model ?? "default",
  });
}

export interface StreamAgentChatOptions {
  onFinish?: UIMessageStreamOnFinishCallback<UIMessage>;
  onMetrics?: (metrics: AgentRunMetrics, toolTrace: AgentToolTrace[]) => void | Promise<void>;
}

export async function streamAgentChat(
  input: StreamAgentChatInput,
  context: WorkflowContext | AgentContext,
  options: StreamAgentChatOptions = {},
): Promise<Response> {
  const message = getLatestUserMessageText(input.messages);
  const agentCtx = "workflow" in context ? context : { workflow: context };
  const startTime = performance.now();
  const toolTrace: AgentToolTrace[] = [];

  const result = await streamText({
    model: getConfiguredModel({ model: input.model, provider: input.provider }),
    system: buildAgentSystemPrompt(input.source, input.actor, agentCtx.memories),
    messages: await convertToModelMessages(input.messages as UIMessage[]),
    tools: createTools(agentCtx, { message }),
    stopWhen: stepCountIs(5),
    onFinish: ({ totalUsage, steps }) => {
      const durationMs = Math.round(performance.now() - startTime);
      options.onMetrics?.(
        {
          inputTokens: totalUsage.inputTokens ?? 0,
          outputTokens: totalUsage.outputTokens ?? 0,
          totalTokens: totalUsage.totalTokens ?? 0,
          durationMs,
          stepCount: steps.length,
          model: input.model ?? "default",
        },
        toolTrace,
      );
    },
  });

  return result.toUIMessageStreamResponse({
    originalMessages: input.messages as UIMessage[],
    onError: (error) => (error instanceof Error ? error.message : String(error)),
    onFinish: options.onFinish,
    consumeSseStream: consumeStream,
  });
}

/** result.steps からツール実行履歴と最終ワークフロー結果を組み立てる */
function buildRunResult(
  runId: string,
  result: {
    text: string;
    steps: ReadonlyArray<{
      toolCalls: ReadonlyArray<{ toolCallId: string; toolName: string; input?: unknown }>;
      toolResults: ReadonlyArray<{ toolCallId: string; toolName: string; output: unknown }>;
    }>;
  },
  metrics: AgentRunMetrics,
): AgentRunResult {
  const toolTrace: AgentToolTrace[] = [];
  let workflow: AgentRunResult["workflow"] | undefined;
  let workflowResult: unknown;

  const workflowNames = new Set<string>([
    "triage",
    "reportDraft",
    "xlsxParse",
    "pdfParse",
    "xlsxCreate",
    "chartCreate",
  ]);

  for (const step of result.steps) {
    for (const tr of step.toolResults) {
      const raw = tr.output as Record<string, unknown>;
      const wf = raw?.workflow as string | undefined;
      const tc = step.toolCalls.find((c) => c.toolCallId === tr.toolCallId);
      const { workflow: _w, ...output } = raw;

      toolTrace.push({
        toolName: tr.toolName as AgentToolTrace["toolName"],
        workflow: (wf ?? tr.toolName) as AgentToolTrace["workflow"],
        input: tc?.input,
        output,
      });

      if (wf && workflowNames.has(wf)) {
        workflow = wf as AgentRunResult["workflow"];
        workflowResult = output;
      }
    }
  }

  if (!workflow || !workflowResult) {
    throw new Error("Agent did not dispatch a workflow");
  }

  return {
    runId,
    workflow,
    message: result.text,
    result: workflowResult as AgentRunResult["result"],
    trace: { tools: toolTrace },
    metrics,
  };
}

function createTools(context: AgentContext, state: { message: string }) {
  const baseTools = {
    runTriage: triageTool({ message: state.message }),
    createReportDraft: reportDraftTool({ message: state.message }),
    parseXlsx: xlsxParseTool(context.workflow),
    parsePdf: pdfParseTool(context.workflow),
    createXlsx: xlsxCreateTool(context.workflow),
    createChart: chartCreateTool(context.workflow),
    searchFiles: fileSearchTool(context.workflow),
  };

  if (context.saveMemory) {
    return { ...baseTools, saveMemory: saveMemoryTool(context.saveMemory) };
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
