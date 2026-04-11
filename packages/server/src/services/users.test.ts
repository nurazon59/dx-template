import { describe, expect, it, vi } from "vitest";
import type { Database } from "../lib/context.js";
import { AppError } from "../lib/errors.js";
import { createUser, findBySlackUserId, listUsers } from "./users.js";

function createMockDb({
  selectResult = [] as unknown[],
  insertResult = [] as unknown[],
} = {}) {
  function makeChain(result: unknown[]) {
    const promise = Promise.resolve(result) as Promise<unknown[]> &
      Record<string, ReturnType<typeof vi.fn>>;
    for (const m of ["from", "where", "limit", "values", "returning"]) {
      promise[m] = vi.fn(() => makeChain(result));
    }
    return promise;
  }
  return {
    select: vi.fn(() => makeChain(selectResult)),
    insert: vi.fn(() => makeChain(insertResult)),
  } as unknown as Database;
}

describe("listUsers", () => {
  it("ユーザー一覧を返す", async () => {
    const mockUsers = [
      { id: "1", slackUserId: "U1", displayName: "Test" },
    ];
    const db = createMockDb({ selectResult: mockUsers });

    const result = await listUsers(db);

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
    const db = createMockDb({ selectResult: [], insertResult: [newUser] });

    const result = await createUser(db, {
      slackUserId: "U1",
      displayName: "Test",
    });

    expect(result).toEqual(newUser);
  });

  it("既存ユーザーがいる場合は AppError(409) を投げる", async () => {
    const existing = { id: "1", slackUserId: "U1", displayName: "Existing" };
    const db = createMockDb({ selectResult: [existing] });

    try {
      await createUser(db, { slackUserId: "U1", displayName: "Test" });
      expect.unreachable("AppError が投げられるべき");
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).status).toBe(409);
      expect((e as AppError).code).toBe("USER_ALREADY_EXISTS");
    }
  });
});

describe("findBySlackUserId", () => {
  it("ユーザーを返す", async () => {
    const user = { id: "1", slackUserId: "U1", displayName: "Test" };
    const db = createMockDb({ selectResult: [user] });

    const result = await findBySlackUserId(db, "U1");

    expect(result).toEqual(user);
  });

  it("見つからない場合は AppError(404) を投げる", async () => {
    const db = createMockDb({ selectResult: [] });

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
