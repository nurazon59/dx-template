import { describe, expect, it, vi } from "vitest";
import type { WorkflowContext } from "../types.js";
import { dispatch, jobStore } from "../registry.js";

describe("pdfParseWorkflow", () => {
  function createMockContext(pages = [{ pageNumber: 1, text: "テスト内容" }]): WorkflowContext {
    return {
      queries: {
        fetchFileBuffer: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
        parsePdf: vi.fn().mockResolvedValue(pages),
      },
    };
  }

  it("fetchFileBuffer → parsePdf の順で実行し結果を jobStore に格納する", async () => {
    const pages = [
      { pageNumber: 1, text: "1ページ目" },
      { pageNumber: 2, text: "2ページ目" },
    ];
    const context = createMockContext(pages);
    const { jobId } = await dispatch("pdfParse", { objectKey: "uploads/test.pdf" }, context);

    const job = jobStore.get(jobId);
    expect(job?.status).toBe("done");
    expect(job?.result).toEqual({
      kind: "pdfParse",
      pageCount: 2,
      pages,
    });
    expect(context.queries.fetchFileBuffer).toHaveBeenCalledWith("uploads/test.pdf");
    expect(context.queries.parsePdf).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]), undefined);
  });

  it("options を parsePdf に透過的に渡す", async () => {
    const context = createMockContext();
    const options = { pages: [1, 3] };
    await dispatch("pdfParse", { objectKey: "uploads/test.pdf", options }, context);

    expect(context.queries.parsePdf).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]), options);
  });

  it("fetchFileBuffer 未設定時にエラーを投げる", async () => {
    await expect(dispatch("pdfParse", { objectKey: "test.pdf" }, { queries: {} })).rejects.toThrow(
      "fetchFileBuffer is not configured",
    );
  });

  it("parsePdf 未設定時にエラーを投げる", async () => {
    const context: WorkflowContext = {
      queries: { fetchFileBuffer: vi.fn().mockResolvedValue(new Uint8Array()) },
    };
    await expect(dispatch("pdfParse", { objectKey: "test.pdf" }, context)).rejects.toThrow(
      "parsePdf is not configured",
    );
  });
});
