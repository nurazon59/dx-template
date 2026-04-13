import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    generateText: vi.fn(async (options) => {
      const triageArgs = { intent: "report", summary: "週次レポート作成の依頼" };
      const triageResult = await options.tools.runTriage.execute(triageArgs, {} as never);

      const reportArgs = {
        title: "週次レポート草案",
        summary: triageResult.summary,
        audience: "事業企画部",
      };
      const reportDraftResult = await options.tools.createReportDraft.execute(
        reportArgs,
        {} as never,
      );

      return {
        text: `report draft workflow を起動しました: ${reportDraftResult.title}`,
        totalUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        steps: [
          {
            toolCalls: [{ toolCallId: "tc-1", toolName: "runTriage", input: triageArgs }],
            toolResults: [{ toolCallId: "tc-1", toolName: "runTriage", output: triageResult }],
          },
          {
            toolCalls: [
              { toolCallId: "tc-2", toolName: "createReportDraft", input: reportArgs },
            ],
            toolResults: [
              { toolCallId: "tc-2", toolName: "createReportDraft", output: reportDraftResult },
            ],
          },
        ],
      };
    }),
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

vi.mock("./env.js", () => ({
  env: new Proxy({} as Record<string, string | undefined>, {
    get: (_target, prop: string) => process.env[prop],
  }),
}));

import { runAgent, runMockAgent, streamAgentChat } from "./index.js";

beforeEach(() => {
  delete process.env["AI_AGENT_MODE"];
  process.env["AI_PROVIDER"] = "openai";
  delete process.env["AI_MODEL"];
  delete process.env["GOOGLE_GENERATIVE_AI_API_KEY"];
  process.env["OPENAI_API_KEY"] = "test-api-key";
  process.env["OPENAI_MODEL"] = "test-model";
});

describe("runAgent", () => {
  it("AI SDK tool execution から workflow を dispatch して trace を返す", async () => {
    const result = await runAgent(
      {
        message: "週次レポートを作って",
        source: "web",
      },
      { queries: {} },
      { runId: "run-test" },
    );

    expect(result).toMatchObject({
      runId: "run-test",
      workflow: "reportDraft",
      message: "report draft workflow を起動しました: 週次レポート草案",
      result: {
        kind: "reportDraft",
        title: "週次レポート草案",
        audience: "事業企画部",
        summary: "週次レポート作成の依頼",
        outline: ["目的", "現状", "論点", "次アクション"],
        draft: [
          "# 週次レポート草案",
          "",
          "対象: 事業企画部",
          "",
          "## 概要",
          "週次レポート作成の依頼",
          "",
          "## 次アクション",
          "必要なデータソースと提出形式を確認して、レポート本文を具体化します。",
        ].join("\n"),
        nextAction: "必要なデータソース、提出形式、締切を確認します。",
      },
      trace: {
        tools: [
          {
            toolName: "runTriage",
            workflow: "triage",
            input: {
              intent: "report",
              summary: "週次レポート作成の依頼",
            },
            output: {
              kind: "triage",
              intent: "report",
              summary: "週次レポート作成の依頼",
              nextAction: "report workflow の要件が固まったら、入力収集とレポート生成に進みます。",
            },
          },
          {
            toolName: "createReportDraft",
            workflow: "reportDraft",
            input: {
              title: "週次レポート草案",
              summary: "週次レポート作成の依頼",
              audience: "事業企画部",
            },
            output: {
              kind: "reportDraft",
              title: "週次レポート草案",
              audience: "事業企画部",
              summary: "週次レポート作成の依頼",
              outline: ["目的", "現状", "論点", "次アクション"],
              draft: [
                "# 週次レポート草案",
                "",
                "対象: 事業企画部",
                "",
                "## 概要",
                "週次レポート作成の依頼",
                "",
                "## 次アクション",
                "必要なデータソースと提出形式を確認して、レポート本文を具体化します。",
              ].join("\n"),
              nextAction: "必要なデータソース、提出形式、締切を確認します。",
            },
          },
        ],
      },
    });
  });

  it("runMockAgent は API key なしで workflow を dispatch する", async () => {
    delete process.env["OPENAI_API_KEY"];
    delete process.env["OPENAI_MODEL"];

    const result = await runMockAgent(
      {
        message: "週次レポートを作って",
        source: "web",
      },
      { queries: {} },
      "run-mock",
    );

    expect(result).toMatchObject({
      runId: "run-mock",
      workflow: "reportDraft",
      message: "mock agent が reportDraft workflow を起動しました。",
      result: {
        kind: "reportDraft",
        title: "レポート草案",
        audience: "事業企画部",
        summary: "週次レポートを作って",
      },
      trace: {
        tools: [
          {
            toolName: "runTriage",
            workflow: "triage",
          },
          {
            toolName: "createReportDraft",
            workflow: "reportDraft",
          },
        ],
      },
    });
  });

  it("AI_PROVIDER=google なら Gemini provider を使う", async () => {
    process.env["AI_PROVIDER"] = "google";
    process.env["AI_MODEL"] = "gemini-3-flash-preview";
    process.env["GOOGLE_GENERATIVE_AI_API_KEY"] = "test-google-api-key";
    delete process.env["OPENAI_API_KEY"];
    delete process.env["OPENAI_MODEL"];

    await runAgent(
      {
        message: "週次レポートを作って",
        source: "web",
      },
      { queries: {} },
      { runId: "run-google" },
    );

    const { google } = await import("@ai-sdk/google");
    expect(google).toHaveBeenCalledWith("gemini-3-flash-preview");
  });

  it("chat input の provider/model で request 単位に切り替える", async () => {
    process.env["OPENAI_API_KEY"] = "test-api-key";
    process.env["OPENAI_MODEL"] = "gpt-5.4-mini";
    process.env["GOOGLE_GENERATIVE_AI_API_KEY"] = "test-google-api-key";

    const response = await streamAgentChat(
      {
        messages: [
          {
            id: "message-1",
            role: "user",
            parts: [{ type: "text", text: "週次レポートを作って" }],
          },
        ],
        provider: "google",
        model: "gemini-3-flash-preview",
        source: "web",
      },
      { queries: {} },
    );

    const { google } = await import("@ai-sdk/google");
    expect(response.status).toBe(200);
    expect(google).toHaveBeenCalledWith("gemini-3-flash-preview");
  });
});
