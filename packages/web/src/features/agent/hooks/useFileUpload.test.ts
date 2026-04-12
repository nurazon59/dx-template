import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/uploads", () => ({
  uploadFile: vi.fn(),
}));

import { uploadFile } from "../../../lib/uploads";
import { buildMessageWithFiles } from "./useFileUpload";

const mockUploadFile = vi.mocked(uploadFile);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("buildMessageWithFiles", () => {
  it("ファイルがなければ本文のみ返す", () => {
    expect(buildMessageWithFiles("こんにちは", [])).toBe("こんにちは");
  });

  it("ファイルがあればメタデータを先頭に付与する", () => {
    const result = buildMessageWithFiles("分析して", [
      { fileName: "report.xlsx", objectKey: "uploads/abc/report.xlsx" },
      { fileName: "summary.pdf", objectKey: "uploads/abc/summary.pdf" },
    ]);

    expect(result).toBe(
      [
        "[添付ファイル]",
        "- report.xlsx (objectKey: uploads/abc/report.xlsx)",
        "- summary.pdf (objectKey: uploads/abc/summary.pdf)",
        "",
        "分析して",
      ].join("\n"),
    );
  });
});

describe("uploadFile integration", () => {
  it("uploadFile が objectKey を返す", async () => {
    mockUploadFile.mockResolvedValue({
      uploadUrl: "https://example.com/upload",
      objectKey: "uploads/abc/report.xlsx",
      expiresIn: 300,
    });

    const file = new File(["data"], "report.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const result = await uploadFile(file);
    expect(result.objectKey).toBe("uploads/abc/report.xlsx");
    expect(mockUploadFile).toHaveBeenCalledWith(file);
  });

  it("uploadFile が失敗したらエラーを投げる", async () => {
    mockUploadFile.mockRejectedValue(new Error("ファイルアップロードに失敗しました"));

    const file = new File(["data"], "report.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    await expect(uploadFile(file)).rejects.toThrow("ファイルアップロードに失敗しました");
  });
});
