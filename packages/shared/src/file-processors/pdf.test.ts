import { describe, expect, it, vi } from "vitest";
import type { PdfPage } from "../schemas/pdf.js";

vi.mock("unpdf", () => ({
  extractText: vi.fn(),
}));

import { parsePdfBuffer } from "./pdf.js";
import { extractText } from "unpdf";

const mockedExtractText = vi.mocked(extractText);

function mockPages(...texts: string[]) {
  mockedExtractText.mockResolvedValueOnce({
    totalPages: texts.length,
    text: texts as unknown as string,
  });
}

describe("parsePdfBuffer", () => {
  it("全ページのテキストを抽出する", async () => {
    mockPages("ページ1の内容", "ページ2の内容", "ページ3の内容");

    const result = await parsePdfBuffer(new Uint8Array());

    expect(result).toEqual<PdfPage[]>([
      { pageNumber: 1, text: "ページ1の内容" },
      { pageNumber: 2, text: "ページ2の内容" },
      { pageNumber: 3, text: "ページ3の内容" },
    ]);
    expect(mockedExtractText).toHaveBeenCalledWith(expect.any(Uint8Array), {
      mergePages: false,
    });
  });

  it("テキスト前後の空白を trim する", async () => {
    mockPages("  先頭空白  ", "\n改行付き\n");

    const result = await parsePdfBuffer(new Uint8Array());

    expect(result[0].text).toBe("先頭空白");
    expect(result[1].text).toBe("改行付き");
  });

  it("pages オプションで特定ページのみ抽出する", async () => {
    mockPages("1ページ目", "2ページ目", "3ページ目");

    const result = await parsePdfBuffer(new Uint8Array(), { pages: [1, 3] });

    expect(result).toEqual<PdfPage[]>([
      { pageNumber: 1, text: "1ページ目" },
      { pageNumber: 3, text: "3ページ目" },
    ]);
  });

  it("pages が空配列の場合は全ページを返す", async () => {
    mockPages("唯一のページ");

    const result = await parsePdfBuffer(new Uint8Array(), { pages: [] });

    expect(result).toHaveLength(1);
  });
});
