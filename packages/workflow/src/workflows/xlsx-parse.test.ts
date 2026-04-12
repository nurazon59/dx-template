import { describe, expect, it, vi } from "vitest";
import type { WorkflowContext } from "../types.js";
import { dispatch, jobStore } from "../registry.js";

describe("xlsxParseWorkflow", () => {
  function createMockContext(sheets = [{ name: "Sheet1", headers: ["A"], rowCount: 1, data: [{ A: 1 }] }]): WorkflowContext {
    return {
      queries: {
        fetchFileBuffer: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
        parseXlsx: vi.fn().mockResolvedValue(sheets),
      },
    };
  }

  it("fetchFileBuffer → parseXlsx の順で実行し結果を jobStore に格納する", async () => {
    const context = createMockContext();
    const { jobId } = await dispatch("xlsxParse", { objectKey: "uploads/test.xlsx" }, context);

    const job = jobStore.get(jobId);
    expect(job?.status).toBe("done");
    expect(job?.result).toEqual({
      kind: "xlsxParse",
      sheets: [{ name: "Sheet1", headers: ["A"], rowCount: 1, data: [{ A: 1 }] }],
    });
    expect(context.queries.fetchFileBuffer).toHaveBeenCalledWith("uploads/test.xlsx");
    expect(context.queries.parseXlsx).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]), undefined);
  });

  it("options を parseXlsx に透過的に渡す", async () => {
    const context = createMockContext();
    const options = { sheetName: "売上" };
    await dispatch("xlsxParse", { objectKey: "uploads/test.xlsx", options }, context);

    expect(context.queries.parseXlsx).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]), options);
  });

  it("fetchFileBuffer 未設定時にエラーを投げる", async () => {
    await expect(
      dispatch("xlsxParse", { objectKey: "test.xlsx" }, { queries: {} }),
    ).rejects.toThrow("fetchFileBuffer is not configured");
  });

  it("parseXlsx 未設定時にエラーを投げる", async () => {
    const context: WorkflowContext = {
      queries: { fetchFileBuffer: vi.fn().mockResolvedValue(new Uint8Array()) },
    };
    await expect(
      dispatch("xlsxParse", { objectKey: "test.xlsx" }, context),
    ).rejects.toThrow("parseXlsx is not configured");
  });
});
