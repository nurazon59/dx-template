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

const mockJobStore = vi.hoisted(() => ({
  listByStatus: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  setPendingApproval: vi.fn(),
  clearPendingApproval: vi.fn(),
  complete: vi.fn(),
}));

vi.mock("@dx-template/workflow", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dx-template/workflow")>();
  return {
    ...actual,
    jobStore: mockJobStore,
  };
});

vi.mock("@dx-template/agent", async () => {
  const actual = await vi.importActual<typeof import("@dx-template/agent")>("@dx-template/agent");
  return {
    ...actual,
    resumeAgent: vi.fn(),
  };
});

vi.mock("../repositories/memories.js", () => ({
  listAll: vi.fn(),
  insert: vi.fn(),
}));

import { app } from "../app.js";
import { resumeAgent } from "@dx-template/agent";
import { auth } from "../lib/auth.js";
import { listAll as listAllMemories } from "../repositories/memories.js";

const mockResumeAgent = vi.mocked(resumeAgent);
const mockGetSession = vi.mocked(auth.api.getSession);
const mockListAllMemories = vi.mocked(listAllMemories);

const TIMESTAMP = "2024-01-01T00:00:00.000Z";

const pendingJob = {
  jobId: "job-1",
  workflowType: "agent-hitl",
  status: "pending-approval" as const,
  currentStep: "pending-approval",
  payload: { message: "テストメッセージ" },
  pendingApproval: {
    approvalId: "approval-1",
    toolCallId: "tool-call-1",
    toolName: "runTriage",
    toolArgs: { category: "bug" },
    messages: [],
  },
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
};

const agentRunResult = {
  runId: "run-1",
  workflow: "triage" as const,
  message: "triage workflow を起動しました",
  result: {
    kind: "triage" as const,
    intent: "general" as const,
    summary: "バグ報告",
    nextAction: "調査を開始します",
  },
  trace: {
    tools: [],
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
  mockListAllMemories.mockResolvedValue([]);
});

describe("GET /api/hitl/pending", () => {
  it("承認待ちジョブが存在しない場合は空配列を返す", async () => {
    mockJobStore.listByStatus.mockReturnValue([]);

    const res = await app.request("/api/hitl/pending");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ jobs: [] });
    expect(mockJobStore.listByStatus).toHaveBeenCalledWith("pending-approval");
  });

  it("承認待ちジョブの一覧を返す", async () => {
    mockJobStore.listByStatus.mockReturnValue([pendingJob]);

    const res = await app.request("/api/hitl/pending");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      jobs: [
        {
          jobId: "job-1",
          approvalId: "approval-1",
          toolName: "runTriage",
          toolArgs: { category: "bug" },
          createdAt: TIMESTAMP,
        },
      ],
    });
  });

  it("未認証なら 401 を返す", async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const res = await app.request("/api/hitl/pending");

    expect(res.status).toBe(401);
  });
});

describe("GET /api/hitl/pending/:jobId", () => {
  it("ジョブが存在しない場合は 404 を返す", async () => {
    mockJobStore.get.mockReturnValue(undefined);

    const res = await app.request("/api/hitl/pending/job-1");

    expect(res.status).toBe(404);
  });

  it("ジョブの詳細を返す", async () => {
    mockJobStore.get.mockReturnValue(pendingJob);

    const res = await app.request("/api/hitl/pending/job-1");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      jobId: "job-1",
      approvalId: "approval-1",
      toolName: "runTriage",
      toolArgs: { category: "bug" },
      createdAt: TIMESTAMP,
    });
    expect(mockJobStore.get).toHaveBeenCalledWith("job-1");
  });

  it("未認証なら 401 を返す", async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const res = await app.request("/api/hitl/pending/job-1");

    expect(res.status).toBe(401);
  });
});

describe("POST /api/hitl/pending/:jobId/resolve", () => {
  it("承認して結果を返す", async () => {
    mockJobStore.get.mockReturnValue(pendingJob);
    mockJobStore.clearPendingApproval.mockReturnValue(undefined);
    mockJobStore.complete.mockReturnValue(undefined);
    mockResumeAgent.mockResolvedValue(agentRunResult);

    const res = await app.request("/api/hitl/pending/job-1/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: true }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(agentRunResult);
    expect(mockJobStore.clearPendingApproval).toHaveBeenCalledWith("job-1");
    expect(mockResumeAgent).toHaveBeenCalledWith(
      {
        approvalId: "approval-1",
        approved: true,
        reason: undefined,
        previousMessages: [],
        source: "slack",
        actor: { userId: "user-1" },
      },
      expect.objectContaining({ workflow: expect.any(Object) }),
    );
    expect(mockJobStore.complete).toHaveBeenCalledWith("job-1", agentRunResult.result);
  });

  it("ジョブが存在しない場合は 404 を返す", async () => {
    mockJobStore.get.mockReturnValue(undefined);

    const res = await app.request("/api/hitl/pending/job-1/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: false, reason: "不要なツール呼び出し" }),
    });

    expect(res.status).toBe(404);
    expect(mockResumeAgent).not.toHaveBeenCalled();
  });

  it("未認証なら 401 を返す", async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const res = await app.request("/api/hitl/pending/job-1/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: true }),
    });

    expect(res.status).toBe(401);
    expect(mockResumeAgent).not.toHaveBeenCalled();
  });
});
