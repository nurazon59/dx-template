import { describe, expect, it } from "vitest";
import type { WorkflowContext, FileSearchResult } from "@dx-template/workflow";
import type { AgentToolTrace } from "../types.js";
import { fileSearchTool } from "./file-search.js";

function createMockContext(overrides: Partial<WorkflowContext> = {}): WorkflowContext {
  return {
    userId: "user-1",
    queries: {
      searchFiles: async () => [],
      ...overrides.queries,
    },
    ...overrides,
  };
}

describe("fileSearchTool", () => {
  it("searchFilesを呼び出してファイル一覧を返す", async () => {
    const files: FileSearchResult[] = [
      {
        id: "file-1",
        objectKey: "uploads/files/user-1/report.xlsx",
        fileName: "report.xlsx",
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        contentLength: 1024,
        createdAt: new Date("2026-01-01"),
      },
    ];
    const context = createMockContext({
      queries: { searchFiles: async () => files },
    });
    const toolTrace: AgentToolTrace[] = [];
    const t = fileSearchTool(context, { toolTrace });

    const result = await t.execute!({ query: "report" }, {} as never);

    expect(result).toEqual({ files, count: 1 });
    expect(toolTrace).toHaveLength(1);
    expect(toolTrace[0]!.toolName).toBe("searchFiles");
  });

  it("searchFilesが未設定のときは空配列とメッセージを返す", async () => {
    const context: WorkflowContext = { queries: {} };
    const toolTrace: AgentToolTrace[] = [];
    const t = fileSearchTool(context, { toolTrace });

    const result = await t.execute!({}, {} as never);

    expect(result).toEqual({
      files: [],
      message: "ファイル検索機能が利用できません",
    });
    expect(toolTrace).toHaveLength(0);
  });
});
