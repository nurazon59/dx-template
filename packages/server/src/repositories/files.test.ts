import { describe, expect, it, vi } from "vitest";
import type { Database } from "../lib/context.js";
import { insert } from "./files.js";

function createMockDb({ insertResult = [] as unknown[] } = {}) {
  function makeChain(result: unknown[]) {
    const promise = Promise.resolve(result) as Promise<unknown[]> &
      Record<string, ReturnType<typeof vi.fn>>;
    for (const m of ["from", "where", "limit", "values", "returning"]) {
      promise[m] = vi.fn(() => makeChain(result));
    }
    return promise;
  }
  return {
    select: vi.fn(() => makeChain([])),
    insert: vi.fn(() => makeChain(insertResult)),
  } as unknown as Database;
}

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
