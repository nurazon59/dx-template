import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    generateText: vi.fn(async (options) => {
      const triageResult = await options.tools.runTriage.execute(
        { intent: "report", summary: "週次レポート作成の依頼" },
        {} as never,
      );
      const reportDraftResult = await options.tools.createReportDraft.execute(
        {
          title: "週次レポート草案",
          summary: triageResult.summary,
          audience: "事業企画部",
        },
        {} as never,
      );
      return {
        text: `report draft workflow を起動しました: ${reportDraftResult.title}`,
      };
    }),
  };
});

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn((model: string) => ({ model })),
}));

import { runAgent } from "./run-agent.js";

beforeEach(() => {
  delete process.env["AI_AGENT_MODE"];
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

    expect(result).toEqual({
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
              message: "週次レポートを作って",
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
              message: "週次レポートを作って",
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

  it("AI_AGENT_MODE=mock なら API key なしで workflow を dispatch する", async () => {
    process.env["AI_AGENT_MODE"] = "mock";
    delete process.env["OPENAI_API_KEY"];
    delete process.env["OPENAI_MODEL"];

    const result = await runAgent(
      {
        message: "週次レポートを作って",
        source: "web",
      },
      { queries: {} },
      { runId: "run-mock" },
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
});
