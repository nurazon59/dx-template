import { describe, expect, it, vi } from "vitest";
import type { Database } from "../lib/context.js";
import { findAll, findBySlackUserId, insert } from "./users.js";

function createMockDb({ selectResult = [] as unknown[], insertResult = [] as unknown[] } = {}) {
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

describe("findAll", () => {
  it("全ユーザーを返す", async () => {
    const mockUsers = [{ id: "1", slackUserId: "U1", displayName: "Test" }];
    const db = createMockDb({ selectResult: mockUsers });

    const result = await findAll(db);

    expect(result).toEqual(mockUsers);
  });
});

describe("findBySlackUserId", () => {
  it("該当ユーザーを返す", async () => {
    const user = { id: "1", slackUserId: "U1", displayName: "Test" };
    const db = createMockDb({ selectResult: [user] });

    const result = await findBySlackUserId(db, "U1");

    expect(result).toEqual(user);
  });

  it("見つからない場合は undefined を返す", async () => {
    const db = createMockDb({ selectResult: [] });

    const result = await findBySlackUserId(db, "UNKNOWN");

    expect(result).toBeUndefined();
  });
});

describe("insert", () => {
  it("ユーザーを作成して返す", async () => {
    const newUser = {
      id: "1",
      slackUserId: "U1",
      displayName: "Test",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const db = createMockDb({ insertResult: [newUser] });

    const result = await insert(db, { slackUserId: "U1", displayName: "Test" });

    expect(result).toEqual(newUser);
  });
});
