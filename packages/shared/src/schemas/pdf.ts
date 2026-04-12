import { z } from "zod";

export const PdfParseOptionsSchema = z.object({
  pages: z.array(z.number()).optional(),
});
export type PdfParseOptions = z.infer<typeof PdfParseOptionsSchema>;

export const PdfPageSchema = z.object({
  pageNumber: z.number(),
  text: z.string(),
});
export type PdfPage = z.infer<typeof PdfPageSchema>;

export const PdfParseResultSchema = z.object({
  kind: z.literal("pdfParse"),
  pageCount: z.number(),
  pages: z.array(PdfPageSchema),
});
export type PdfParseResult = z.infer<typeof PdfParseResultSchema>;
