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

vi.mock("../repositories/agent-conversations.js", () => ({
  ensureConversation: vi.fn(),
  findConversation: vi.fn(),
  listConversations: vi.fn(),
  replaceConversationMessages: vi.fn(),
}));

vi.mock("../repositories/memories.js", () => ({
  listAll: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("../repositories/agent-runs.js", () => ({
  insert: vi.fn(),
}));

import { app } from "../app.js";
import { runAgent, streamAgentChat } from "@dx-template/agent";
import { auth } from "../lib/auth.js";
import {
  ensureConversation,
  findConversation,
  listConversations,
  replaceConversationMessages,
} from "../repositories/agent-conversations.js";
import { listAll as listAllMemories } from "../repositories/memories.js";

const mockRunAgent = vi.mocked(runAgent);
const mockStreamAgentChat = vi.mocked(streamAgentChat);
const mockGetSession = vi.mocked(auth.api.getSession);
const mockEnsureConversation = vi.mocked(ensureConversation);
const mockFindConversation = vi.mocked(findConversation);
const mockListConversations = vi.mocked(listConversations);
const mockReplaceConversationMessages = vi.mocked(replaceConversationMessages);
const mockListAllMemories = vi.mocked(listAllMemories);

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
  mockEnsureConversation.mockResolvedValue({
    id: "00000000-0000-4000-8000-000000000001",
    title: "週次レポートを作って",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    lastMessageAt: new Date("2024-01-01T00:00:00.000Z"),
    messages: [],
  });
  mockReplaceConversationMessages.mockResolvedValue(undefined);
  mockListAllMemories.mockResolvedValue([]);
});

describe("GET /api/agent/conversations", () => {
  it("Agent conversation list を返す", async () => {
    const timestamp = "2024-01-01T00:00:00.000Z";
    const conversations = [
      {
        id: "00000000-0000-4000-8000-000000000001",
        title: "週次レポートを作って",
        createdAt: new Date(timestamp),
        updatedAt: new Date(timestamp),
        lastMessageAt: new Date(timestamp),
      },
    ];
    mockListConversations.mockResolvedValue(conversations);

    const res = await app.request("/api/agent/conversations");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      conversations: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          title: "週次レポートを作って",
          createdAt: timestamp,
          updatedAt: timestamp,
          lastMessageAt: timestamp,
        },
      ],
    });
    expect(mockListConversations).toHaveBeenCalledWith({}, "user-1");
  });
});

describe("GET /api/agent/conversations/:conversationId", () => {
  it("Agent conversation を返す", async () => {
    const timestamp = "2024-01-01T00:00:00.000Z";
    const conversation = {
      id: "00000000-0000-4000-8000-000000000001",
      title: "週次レポートを作って",
      createdAt: new Date(timestamp),
      updatedAt: new Date(timestamp),
      lastMessageAt: new Date(timestamp),
      messages: [
        {
          id: "message-1",
          role: "user" as const,
          parts: [{ type: "text", text: "週次レポートを作って" }],
          createdAt: new Date(timestamp),
        },
      ],
    };
    mockFindConversation.mockResolvedValue(conversation);

    const res = await app.request("/api/agent/conversations/00000000-0000-4000-8000-000000000001");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      conversation: {
        id: "00000000-0000-4000-8000-000000000001",
        title: "週次レポートを作って",
        createdAt: timestamp,
        updatedAt: timestamp,
        lastMessageAt: timestamp,
        messages: [
          {
            id: "message-1",
            role: "user",
            parts: [{ type: "text", text: "週次レポートを作って" }],
            createdAt: timestamp,
          },
        ],
      },
    });
    expect(mockFindConversation).toHaveBeenCalledWith(
      {},
      {
        conversationId: "00000000-0000-4000-8000-000000000001",
        userId: "user-1",
      },
    );
  });

  it("会話が見つからない場合は 404 を返す", async () => {
    mockFindConversation.mockResolvedValue(undefined);

    const res = await app.request("/api/agent/conversations/00000000-0000-4000-8000-000000000001");

    expect(res.status).toBe(404);
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
      metrics: {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        durationMs: 500,
        stepCount: 1,
        model: "default",
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
      expect.objectContaining({ workflow: expect.any(Object) }),
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
        role: "user" as const,
        parts: [{ type: "text" as const, text: "週次レポートを作って" }],
      },
    ];
    const res = await app.request("/api/agent/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: "00000000-0000-4000-8000-000000000001",
        messages,
        provider: "google",
        model: "gemini-3-flash-preview",
      }),
    });

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("stream");
    expect(mockEnsureConversation).toHaveBeenCalledWith(
      {},
      {
        conversationId: "00000000-0000-4000-8000-000000000001",
        userId: "user-1",
        messages,
      },
    );
    expect(mockStreamAgentChat).toHaveBeenCalledWith(
      {
        conversationId: "00000000-0000-4000-8000-000000000001",
        messages,
        provider: "google",
        model: "gemini-3-flash-preview",
        actor: {
          userId: "user-1",
        },
        source: "web",
      },
      expect.objectContaining({ workflow: expect.any(Object) }),
      {
        onFinish: expect.any(Function),
        onMetrics: expect.any(Function),
      },
    );

    const onFinish = mockStreamAgentChat.mock.calls[0]![2]!.onFinish!;
    await onFinish({
      messages,
      isContinuation: false,
      isAborted: false,
      responseMessage: messages[0]!,
      finishReason: "stop",
    });

    expect(mockReplaceConversationMessages).toHaveBeenCalledWith(
      {},
      {
        conversationId: "00000000-0000-4000-8000-000000000001",
        userId: "user-1",
        messages,
      },
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
