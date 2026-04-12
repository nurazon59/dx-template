import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/index.js", () => ({ db: {} }));

vi.mock("../lib/auth.js", () => ({
  auth: {
    handler: vi.fn(),
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@dx-template/agent", async () => {
  const actual = await vi.importActual<typeof import("@dx-template/agent")>("@dx-template/agent");
  return {
    ...actual,
    runAgent: vi.fn(),
    streamAgentChat: vi.fn(),
  };
});

import { app } from "../app.js";
import { runAgent, streamAgentChat } from "@dx-template/agent";
import { auth } from "../lib/auth.js";

const mockRunAgent = vi.mocked(runAgent);
const mockStreamAgentChat = vi.mocked(streamAgentChat);
const mockGetSession = vi.mocked(auth.api.getSession);

beforeEach(() => {
  vi.resetAllMocks();
  mockGetSession.mockResolvedValue({
    user: {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
      image: null,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    },
    session: {
      id: "session-1",
      token: "token",
      userId: "user-1",
      expiresAt: new Date("2024-01-02T00:00:00.000Z"),
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    },
  });
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
        actor: {
          userId: "user-1",
        },
        source: "web",
      },
      { queries: {} },
    );
  });

  it("未認証なら 401 を返す", async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const res = await app.request("/api/agent/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "週次レポートを作って",
        source: "web",
      }),
    });

    expect(res.status).toBe(401);
    expect(mockRunAgent).not.toHaveBeenCalled();
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

describe("POST /api/agent/chat", () => {
  it("Agent chat stream を返す", async () => {
    mockStreamAgentChat.mockResolvedValue(
      new Response("stream", {
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    const messages = [
      {
        id: "message-1",
        role: "user",
        parts: [{ type: "text", text: "週次レポートを作って" }],
      },
    ];
    const res = await app.request("/api/agent/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("stream");
    expect(mockStreamAgentChat).toHaveBeenCalledWith(
      {
        messages,
        actor: {
          userId: "user-1",
        },
        source: "web",
      },
      { queries: {} },
    );
  });

  it("未認証なら 401 を返す", async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const res = await app.request("/api/agent/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            id: "message-1",
            role: "user",
            parts: [{ type: "text", text: "週次レポートを作って" }],
          },
        ],
      }),
    });

    expect(res.status).toBe(401);
    expect(mockStreamAgentChat).not.toHaveBeenCalled();
  });
});
