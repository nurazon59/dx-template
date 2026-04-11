import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/index.js", () => ({ db: {} }));

vi.mock("../services/users.js", () => ({
  listUsers: vi.fn(),
  createUser: vi.fn(),
  findBySlackUserId: vi.fn(),
}));

import { app } from "../app.js";
import { AppError } from "../lib/errors.js";
import { createUser, findBySlackUserId, listUsers } from "../services/users.js";

const mockListUsers = vi.mocked(listUsers);
const mockCreateUser = vi.mocked(createUser);
const mockFindBySlackUserId = vi.mocked(findBySlackUserId);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/users", () => {
  it("ユーザー一覧を返す", async () => {
    const users = [{ id: "1", slackUserId: "U1", displayName: "Test" }];
    mockListUsers.mockResolvedValue(users as never);

    const res = await app.request("/api/users");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ users });
  });
});

describe("POST /api/users", () => {
  it("ユーザーを作成して 201 を返す", async () => {
    const user = {
      id: "1",
      slackUserId: "U1",
      displayName: "Test",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };
    mockCreateUser.mockResolvedValue(user as never);

    const res = await app.request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slackUserId: "U1", displayName: "Test" }),
    });

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ user });
  });

  it("バリデーションエラーで 400 を返す", async () => {
    const res = await app.request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slackUserId: "" }),
    });

    expect(res.status).toBe(400);
  });

  it("重複時に 409 を返す", async () => {
    mockCreateUser.mockRejectedValue(new AppError("USER_ALREADY_EXISTS", "既に登録済み", 409));

    const res = await app.request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slackUserId: "U1", displayName: "Test" }),
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("USER_ALREADY_EXISTS");
  });
});

describe("GET /api/users/:slackUserId", () => {
  it("ユーザーを返す", async () => {
    const user = { id: "1", slackUserId: "U1", displayName: "Test" };
    mockFindBySlackUserId.mockResolvedValue(user as never);

    const res = await app.request("/api/users/U1");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user });
  });

  it("見つからない場合は 404 を返す", async () => {
    mockFindBySlackUserId.mockRejectedValue(new AppError("USER_NOT_FOUND", "見つかりません", 404));

    const res = await app.request("/api/users/UNKNOWN");

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe("USER_NOT_FOUND");
  });
});
