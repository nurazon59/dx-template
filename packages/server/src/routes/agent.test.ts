import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/index.js", () => ({ db: {} }));

vi.mock("@dx-template/agent", async () => {
  const actual = await vi.importActual<typeof import("@dx-template/agent")>("@dx-template/agent");
  return {
    ...actual,
    runAgent: vi.fn(),
  };
});

import { app } from "../app.js";
import { runAgent } from "@dx-template/agent";

const mockRunAgent = vi.mocked(runAgent);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/agent/runs", () => {
  it("Agent を実行して run result を返す", async () => {
    const result = {
      runId: "run-1",
      workflow: "reportDraft" as const,
      message: "report draft workflow を起動しました",
      result: {
        kind: "reportDraft" as const,
        title: "週次レポート草案",
        audience: "事業企画部",
        summary: "週次レポート作成の依頼",
        outline: ["目的", "現状", "論点", "次アクション"],
        draft: "# 週次レポート草案",
        nextAction: "必要なデータソース、提出形式、締切を確認します。",
      },
      trace: {
        tools: [
          {
            toolName: "createReportDraft" as const,
            workflow: "reportDraft" as const,
            input: { title: "週次レポート草案" },
            output: { kind: "reportDraft" },
          },
        ],
      },
    };
    mockRunAgent.mockResolvedValue(result);

    const res = await app.request("/api/agent/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "週次レポートを作って",
        source: "web",
      }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(result);
    expect(mockRunAgent).toHaveBeenCalledWith(
      {
        message: "週次レポートを作って",
        source: "web",
      },
      { queries: {} },
    );
  });

  it("バリデーションエラーで 400 を返す", async () => {
    const res = await app.request("/api/agent/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "",
        source: "web",
      }),
    });

    expect(res.status).toBe(400);
  });

  it("Agent 設定エラーを AppError として返す", async () => {
    const { AgentConfigurationError } = await import("@dx-template/agent");
    mockRunAgent.mockRejectedValue(
      new AgentConfigurationError("OPENAI_MODEL_NOT_CONFIGURED", "OPENAI_MODEL is not set"),
    );

    const res = await app.request("/api/agent/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "週次レポートを作って",
        source: "web",
      }),
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      code: "OPENAI_MODEL_NOT_CONFIGURED",
      message: "OPENAI_MODEL is not set",
    });
  });
});
