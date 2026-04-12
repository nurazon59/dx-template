import { extractText } from "unpdf";
import type { PdfParseOptions, PdfPage } from "../schemas/pdf.js";

export async function parsePdfBuffer(
  buffer: Uint8Array,
  options?: PdfParseOptions,
): Promise<PdfPage[]> {
  const { text: rawPages } = await extractText(buffer, { mergePages: false });

  const allPages: PdfPage[] = rawPages.map((text, index) => ({
    pageNumber: index + 1,
    text: text.trim(),
  }));

  if (options?.pages && options.pages.length > 0) {
    const pageSet = new Set(options.pages);
    return allPages.filter((p) => pageSet.has(p.pageNumber));
  }

  return allPages;
}
