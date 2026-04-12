import { describe, expect, it, vi } from "vitest";
import type { Database } from "../lib/context.js";
import { insert, search } from "./files.js";

function createMockDb({ insertResult = [] as unknown[], selectResult = [] as unknown[] } = {}) {
  function makeChain(result: unknown[]) {
    const promise = Promise.resolve(result) as Promise<unknown[]> &
      Record<string, ReturnType<typeof vi.fn>>;
    for (const m of ["from", "where", "limit", "values", "returning", "orderBy"]) {
      promise[m] = vi.fn(() => makeChain(result));
    }
    return promise;
  }
  return {
    select: vi.fn(() => makeChain(selectResult)),
    insert: vi.fn(() => makeChain(insertResult)),
    delete: vi.fn(() => makeChain([])),
  } as unknown as Database;
}

describe("search", () => {
  it("userIdでフィルタしてファイルを返す", async () => {
    const expected = [
      {
        id: "file-1",
        objectKey: "uploads/files/user-1/abc.xlsx",
        userId: "user-1",
        fileName: "report.xlsx",
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        contentLength: 1024,
        createdAt: new Date(),
      },
    ];
    const db = createMockDb({ selectResult: expected });

    const result = await search(db, { userId: "user-1" });

    expect(result).toEqual(expected);
    expect(db.select).toHaveBeenCalled();
  });

  it("queryとcontentTypeでフィルタできる", async () => {
    const db = createMockDb({ selectResult: [] });

    const result = await search(db, {
      query: "report",
      contentType: "application/pdf",
      userId: "user-1",
    });

    expect(result).toEqual([]);
    expect(db.select).toHaveBeenCalled();
  });
});

describe("insert", () => {
  it("ファイルメタデータを保存して返す", async () => {
    const file = {
      id: "file-1",
      objectKey: "uploads/files/user-1/abc.xlsx",
      userId: "user-1",
      fileName: "report.xlsx",
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      contentLength: 1024,
      createdAt: new Date(),
    };
    const db = createMockDb({ insertResult: [file] });

    const result = await insert(db, {
      objectKey: file.objectKey,
      userId: file.userId,
      fileName: file.fileName,
      contentType: file.contentType,
      contentLength: file.contentLength,
    });

    expect(result).toEqual(file);
  });
});
