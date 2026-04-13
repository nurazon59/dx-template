import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    generateText: vi.fn(),
    streamText: vi.fn(() => ({
      toUIMessageStreamResponse: vi.fn(() => new Response("stream")),
    })),
  };
});

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn((model: string) => ({ model })),
}));

vi.mock("@ai-sdk/google", () => ({
  google: vi.fn((model: string) => ({ model })),
}));

vi.mock("../env.js", () => ({
  env: new Proxy({} as Record<string, string | undefined>, {
    get: (_target, prop: string) => process.env[prop],
  }),
}));

import { generateText } from "ai";
import { runAgent, resumeAgent } from "../index.js";

const mockGenerateText = vi.mocked(generateText);

const triageArgs = { intent: "report", summary: "週次レポート作成の依頼" };
const triageOutput = {
  workflow: "triage",
  kind: "triage",
  intent: "report",
  summary: "週次レポート作成の依頼",
  nextAction: "report workflow の要件が固まったら、入力収集とレポート生成に進みます。",
};
const reportArgs = {
  title: "週次レポート草案",
  summary: "週次レポート作成の依頼",
  audience: "事業企画部",
};
const reportOutput = {
  workflow: "reportDraft",
  kind: "reportDraft",
  title: "週次レポート草案",
  audience: "事業企画部",
  summary: "週次レポート作成の依頼",
  outline: ["目的", "現状", "論点", "次アクション"],
  draft: "# 週次レポート草案",
  nextAction: "必要なデータソース、提出形式、締切を確認します。",
};

const normalResult = {
  text: "reportDraft ワークフローを起動しました",
  totalUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
  steps: [
    {
      toolCalls: [{ toolCallId: "tc-1", toolName: "runTriage", input: triageArgs }],
      toolResults: [{ toolCallId: "tc-1", toolName: "runTriage", output: triageOutput }],
    },
    {
      toolCalls: [{ toolCallId: "tc-2", toolName: "createReportDraft", input: reportArgs }],
      toolResults: [{ toolCallId: "tc-2", toolName: "createReportDraft", output: reportOutput }],
    },
  ],
  response: { messages: [] },
};

const hitlPendingResult = {
  text: "",
  totalUsage: { inputTokens: 80, outputTokens: 10, totalTokens: 90 },
  steps: [],
  response: {
    messages: [
      {
        role: "assistant",
        content: [
          {
            type: "tool-approval-request",
            approvalId: "approval-123",
            toolCall: {
              toolCallId: "tc-hitl-1",
              toolName: "runTriage",
              input: triageArgs,
            },
          },
        ],
      },
    ],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env["AI_AGENT_MODE"];
  process.env["AI_PROVIDER"] = "openai";
  delete process.env["AI_MODEL"];
  process.env["OPENAI_API_KEY"] = "test-api-key";
  process.env["OPENAI_MODEL"] = "test-model";
});

describe("HITL (Human-in-the-Loop)", () => {
  describe("runAgent with hitlToolNames", () => {
    it("tool-approval-request を検出したとき AgentPendingResult を返す", async () => {
      mockGenerateText.mockResolvedValue(hitlPendingResult as never);

      const result = await runAgent(
        { message: "週次レポートを作って", source: "web" },
        { queries: {} },
        { runId: "run-hitl", hitlToolNames: ["runTriage"] },
      );

      expect(result).toMatchObject({
        runId: "run-hitl",
        pendingApproval: {
          approvalId: "approval-123",
          toolCallId: "tc-hitl-1",
          toolName: "runTriage",
          toolArgs: triageArgs,
        },
        metrics: expect.objectContaining({ stepCount: 0 }),
      });
      expect("pendingApproval" in result).toBe(true);
      expect("workflow" in result).toBe(false);
    });

    it("pendingApproval.messages に response.messages が格納される", async () => {
      mockGenerateText.mockResolvedValue(hitlPendingResult as never);

      const result = await runAgent(
        { message: "週次レポートを作って", source: "web" },
        { queries: {} },
        { hitlToolNames: ["runTriage"] },
      );

      if (!("pendingApproval" in result)) throw new Error("AgentPendingResult expected");
      expect(result.pendingApproval.messages).toEqual(hitlPendingResult.response.messages);
    });
  });

  describe("runAgent without hitlToolNames", () => {
    it("通常の AgentRunResult を返す", async () => {
      mockGenerateText.mockResolvedValue(normalResult as never);

      const result = await runAgent(
        { message: "週次レポートを作って", source: "web" },
        { queries: {} },
        { runId: "run-normal" },
      );

      expect(result).toMatchObject({
        runId: "run-normal",
        workflow: "reportDraft",
        message: "reportDraft ワークフローを起動しました",
      });
      expect("pendingApproval" in result).toBe(false);
    });

    it("response.messages に approval-request がなければ通常結果を返す", async () => {
      mockGenerateText.mockResolvedValue(normalResult as never);

      const result = await runAgent(
        { message: "週次レポートを作って", source: "web" },
        { queries: {} },
        { hitlToolNames: ["runTriage"] }, // HITL 有効でも approval-request がなければ通常結果
      );

      expect("pendingApproval" in result).toBe(false);
      expect("workflow" in result).toBe(true);
    });
  });

  describe("resumeAgent", () => {
    it("previousMessages に tool-approval-response を付加して generateText を呼ぶ", async () => {
      mockGenerateText.mockResolvedValue(normalResult as never);

      const previousMessages = [
        {
          role: "assistant",
          content: [
            {
              type: "tool-approval-request",
              approvalId: "approval-123",
              toolCall: { toolCallId: "tc-hitl-1", toolName: "runTriage", input: triageArgs },
            },
          ],
        },
      ];

      await resumeAgent(
        {
          approvalId: "approval-123",
          approved: true,
          previousMessages,
          source: "web",
        },
        { queries: {} },
      );

      expect(mockGenerateText).toHaveBeenCalledOnce();
      const calledWith = mockGenerateText.mock.calls[0]![0] as {
        messages: Array<{ role: string; content: unknown[] }>;
      };
      const lastMsg = calledWith.messages[calledWith.messages.length - 1];
      expect(lastMsg?.content).toContainEqual({
        type: "tool-approval-response",
        approvalId: "approval-123",
        approved: true,
      });
    });

    it("approved=false のとき reason を tool-approval-response に含める", async () => {
      mockGenerateText.mockResolvedValue(normalResult as never);

      const previousMessages = [
        {
          role: "assistant",
          content: [
            {
              type: "tool-approval-request",
              approvalId: "approval-456",
              toolCall: { toolCallId: "tc-hitl-2", toolName: "runTriage", input: triageArgs },
            },
          ],
        },
      ];

      await resumeAgent(
        {
          approvalId: "approval-456",
          approved: false,
          reason: "セキュリティポリシー違反",
          previousMessages,
          source: "web",
        },
        { queries: {} },
      );

      const calledWith = mockGenerateText.mock.calls[0]![0] as {
        messages: Array<{ role: string; content: unknown[] }>;
      };
      const lastMsg = calledWith.messages[calledWith.messages.length - 1];
      expect(lastMsg?.content).toContainEqual({
        type: "tool-approval-response",
        approvalId: "approval-456",
        approved: false,
        reason: "セキュリティポリシー違反",
      });
    });

    it("generateText の結果から AgentRunResult を組み立てる", async () => {
      mockGenerateText.mockResolvedValue(normalResult as never);

      const result = await resumeAgent(
        {
          approvalId: "approval-123",
          approved: true,
          previousMessages: [{ role: "assistant", content: [] }],
          source: "web",
        },
        { queries: {} },
      );

      expect(result).toMatchObject({
        workflow: "reportDraft",
        message: "reportDraft ワークフローを起動しました",
        trace: {
          tools: expect.arrayContaining([
            expect.objectContaining({ toolName: "runTriage" }),
            expect.objectContaining({ toolName: "createReportDraft" }),
          ]),
        },
      });
    });
  });
});
