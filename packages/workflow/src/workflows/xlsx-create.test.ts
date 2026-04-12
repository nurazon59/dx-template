import { describe, expect, it, vi } from "vitest";
import type { WorkflowContext } from "../types.js";
import { dispatch, jobStore } from "../registry.js";

describe("xlsxCreateWorkflow", () => {
  function createMockContext(): WorkflowContext {
    return {
      queries: {
        buildXlsx: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
        storeFileBuffer: vi.fn().mockResolvedValue("uploads/files/test/output.xlsx"),
      },
    };
  }

  const testSheets = [{ name: "Sheet1", headers: ["A", "B"], data: [{ A: 1, B: 2 }] }];

  it("buildXlsx → storeFileBuffer の順で実行し結果を jobStore に格納する", async () => {
    const context = createMockContext();
    const { jobId } = await dispatch(
      "xlsxCreate",
      { sheets: testSheets, fileName: "output.xlsx" },
      context,
    );

    const job = jobStore.get(jobId);
    expect(job?.status).toBe("done");
    expect(job?.result).toEqual({
      kind: "xlsxCreate",
      objectKey: "uploads/files/test/output.xlsx",
      downloadUrl: "",
    });
    expect(context.queries.buildXlsx).toHaveBeenCalledWith(testSheets);
    expect(context.queries.storeFileBuffer).toHaveBeenCalledWith(
      new Uint8Array([1, 2, 3]),
      "output.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  });

  it("buildXlsx 未設定時にエラーを投げる", async () => {
    await expect(
      dispatch("xlsxCreate", { sheets: testSheets, fileName: "output.xlsx" }, { queries: {} }),
    ).rejects.toThrow("buildXlsx is not configured");
  });

  it("storeFileBuffer 未設定時にエラーを投げる", async () => {
    const context: WorkflowContext = {
      queries: { buildXlsx: vi.fn().mockResolvedValue(new Uint8Array()) },
    };
    await expect(
      dispatch("xlsxCreate", { sheets: testSheets, fileName: "output.xlsx" }, context),
    ).rejects.toThrow("storeFileBuffer is not configured");
  });
});
