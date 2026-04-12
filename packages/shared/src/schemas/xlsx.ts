import { z } from "zod";

export const XlsxParseOptionsSchema = z.object({
  sheetName: z.string().optional(),
  headerRow: z.number().optional(),
});
export type XlsxParseOptions = z.infer<typeof XlsxParseOptionsSchema>;

export const XlsxSheetSchema = z.object({
  name: z.string(),
  headers: z.array(z.string()),
  rowCount: z.number(),
  data: z.array(z.record(z.string(), z.unknown())),
});
export type XlsxSheet = z.infer<typeof XlsxSheetSchema>;

export const XlsxParseResultSchema = z.object({
  kind: z.literal("xlsxParse"),
  sheets: z.array(XlsxSheetSchema),
});
export type XlsxParseResult = z.infer<typeof XlsxParseResultSchema>;

export const XlsxCreateSheetInputSchema = z.object({
  name: z.string(),
  headers: z.array(z.string()),
  data: z.array(z.record(z.string(), z.unknown())),
});
export type XlsxCreateSheetInput = z.infer<typeof XlsxCreateSheetInputSchema>;

export const XlsxCreateOptionsSchema = z.object({
  sheets: z.array(XlsxCreateSheetInputSchema),
});
export type XlsxCreateOptions = z.infer<typeof XlsxCreateOptionsSchema>;

export const XlsxCreateResultSchema = z.object({
  kind: z.literal("xlsxCreate"),
  objectKey: z.string(),
  downloadUrl: z.string(),
});
export type XlsxCreateResult = z.infer<typeof XlsxCreateResultSchema>;
