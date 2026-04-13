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
  AgentPendingResult,
  AgentRunInput,
  AgentRunMetrics,
  AgentRunResult,
  AgentToolTrace,
  ResumeAgentInput,
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
  hitlToolNames?: string[];
}

export async function runAgent(
  input: AgentRunInput,
  context: WorkflowContext | AgentContext,
  options: RunAgentOptions = {},
): Promise<AgentRunResult | AgentPendingResult> {
  const runId = options.runId ?? crypto.randomUUID();
  const agentCtx = "workflow" in context ? context : { workflow: context };

  const startTime = performance.now();

  const result = await generateText({
    model: getConfiguredModel({ model: options.model }),
    system: buildAgentSystemPrompt(input.source, input.actor, agentCtx.memories),
    prompt: input.message,
    tools: createTools(agentCtx, { message: input.message }, options.hitlToolNames),
    stopWhen: stepCountIs(5),
  });

  const durationMs = Math.round(performance.now() - startTime);
  const metrics: AgentRunMetrics = {
    inputTokens: result.totalUsage.inputTokens ?? 0,
    outputTokens: result.totalUsage.outputTokens ?? 0,
    totalTokens: result.totalUsage.totalTokens ?? 0,
    durationMs,
    stepCount: result.steps.length,
    model: options.model ?? "default",
  };

  // AI SDK の tool-approval-request を検出
  const responseMessages = (result as { response?: { messages?: unknown[] } }).response?.messages;
  const approvalRequest = responseMessages
    ?.flatMap((m: unknown) => {
      const msg = m as { role?: string; content?: unknown[] };
      return Array.isArray(msg.content) ? msg.content : [];
    })
    .find((c: unknown) => (c as { type?: string }).type === "tool-approval-request") as
    | {
        approvalId: string;
        toolCall: { toolCallId: string; toolName: string; input: unknown };
      }
    | undefined;

  if (approvalRequest) {
    return {
      runId,
      message: result.text,
      pendingApproval: {
        approvalId: approvalRequest.approvalId,
        toolCallId: approvalRequest.toolCall.toolCallId,
        toolName: approvalRequest.toolCall.toolName,
        toolArgs: approvalRequest.toolCall.input,
        messages: responseMessages!,
      },
      metrics,
    };
  }

  return buildRunResult(runId, result as Parameters<typeof buildRunResult>[1], metrics);
}

export async function resumeAgent(
  input: ResumeAgentInput,
  context: WorkflowContext | AgentContext,
  options: { model?: string } = {},
): Promise<AgentRunResult> {
  const agentCtx = "workflow" in context ? context : { workflow: context };
  const startTime = performance.now();

  const approvalResponse = {
    type: "tool-approval-response" as const,
    approvalId: input.approvalId,
    approved: input.approved,
    ...(input.reason ? { reason: input.reason } : {}),
  };

  const previousMessages = input.previousMessages as Array<Record<string, unknown>>;
  const lastMessage = previousMessages[previousMessages.length - 1];
  const messagesWithApproval = [
    ...previousMessages.slice(0, -1),
    {
      ...lastMessage,
      content: [...((lastMessage?.content as unknown[]) ?? []), approvalResponse],
    },
  ];

  const result = await generateText({
    model: getConfiguredModel({ model: options.model }),
    messages: messagesWithApproval as NonNullable<Parameters<typeof generateText>[0]["messages"]>,
    tools: createTools(agentCtx, { message: "" }),
    stopWhen: stepCountIs(5),
  });

  const durationMs = Math.round(performance.now() - startTime);
  const runId = crypto.randomUUID();

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

function createTools(context: AgentContext, state: { message: string }, hitlToolNames?: string[]) {
  const baseTools = {
    runTriage: triageTool({ message: state.message }),
    createReportDraft: reportDraftTool({ message: state.message }),
    parseXlsx: xlsxParseTool(context.workflow),
    parsePdf: pdfParseTool(context.workflow),
    createXlsx: xlsxCreateTool(context.workflow),
    createChart: chartCreateTool(context.workflow),
    searchFiles: fileSearchTool(context.workflow),
    ...(context.saveMemory ? { saveMemory: saveMemoryTool(context.saveMemory) } : {}),
  };

  if (!hitlToolNames) return baseTools;

  const tools = { ...baseTools } as Record<string, Record<string, unknown>>;
  for (const name of hitlToolNames) {
    if (name in tools) {
      tools[name] = { ...tools[name], needsApproval: true };
    }
  }
  return tools as unknown as typeof baseTools;
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
