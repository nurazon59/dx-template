import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "../lib/context.js";
import { AppError } from "../lib/errors.js";

vi.mock("../repositories/users.js", () => ({
  findAll: vi.fn(),
  findBySlackUserId: vi.fn(),
  insert: vi.fn(),
}));

import * as usersRepo from "../repositories/users.js";
import { createUser, findBySlackUserId, listUsers } from "./users.js";

const mockFindAll = vi.mocked(usersRepo.findAll);
const mockFindBySlackUserId = vi.mocked(usersRepo.findBySlackUserId);
const mockInsert = vi.mocked(usersRepo.insert);

const db = {} as Database;

beforeEach(() => {
  vi.resetAllMocks();
});

describe("listUsers", () => {
  it("ユーザー一覧を返す", async () => {
    const mockUsers = [{ id: "1", slackUserId: "U1", displayName: "Test" }];
    mockFindAll.mockResolvedValue(mockUsers as never);

    const result = await listUsers(db);

    expect(mockFindAll).toHaveBeenCalledWith(db);
    expect(result).toEqual(mockUsers);
  });
});

describe("createUser", () => {
  it("新規ユーザーを作成する", async () => {
    const newUser = {
      id: "1",
      slackUserId: "U1",
      displayName: "Test",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockFindBySlackUserId.mockResolvedValue(undefined);
    mockInsert.mockResolvedValue(newUser);

    const result = await createUser(db, {
      slackUserId: "U1",
      displayName: "Test",
    });

    expect(mockFindBySlackUserId).toHaveBeenCalledWith(db, "U1");
    expect(mockInsert).toHaveBeenCalledWith(db, { slackUserId: "U1", displayName: "Test" });
    expect(result).toEqual(newUser);
  });

  it("既存ユーザーがいる場合は AppError(409) を投げる", async () => {
    const existing = { id: "1", slackUserId: "U1", displayName: "Existing" };
    mockFindBySlackUserId.mockResolvedValue(existing as never);

    try {
      await createUser(db, { slackUserId: "U1", displayName: "Test" });
      expect.unreachable("AppError が投げられるべき");
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).status).toBe(409);
      expect((e as AppError).code).toBe("USER_ALREADY_EXISTS");
    }

    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe("findBySlackUserId", () => {
  it("ユーザーを返す", async () => {
    const user = { id: "1", slackUserId: "U1", displayName: "Test" };
    mockFindBySlackUserId.mockResolvedValue(user as never);

    const result = await findBySlackUserId(db, "U1");

    expect(result).toEqual(user);
  });

  it("見つからない場合は AppError(404) を投げる", async () => {
    mockFindBySlackUserId.mockResolvedValue(undefined);

    try {
      await findBySlackUserId(db, "UNKNOWN");
      expect.unreachable("AppError が投げられるべき");
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).status).toBe(404);
      expect((e as AppError).code).toBe("USER_NOT_FOUND");
    }
  });
});
