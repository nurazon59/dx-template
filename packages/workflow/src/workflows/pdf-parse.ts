import { z } from "zod";
import { PdfParseOptionsSchema, PdfParseResultSchema } from "@dx-template/shared";
import type { PdfParseResult } from "@dx-template/shared";
import type { Workflow } from "../types.js";
import { jobStore } from "../runner.js";

export const PdfParseWorkflowPayloadSchema = z.object({
  objectKey: z.string(),
  options: PdfParseOptionsSchema.optional(),
});
export type PdfParseWorkflowPayload = z.infer<typeof PdfParseWorkflowPayloadSchema>;

export { PdfParseResultSchema };
export type { PdfParseResult };

export const pdfParseWorkflow: Workflow<PdfParseWorkflowPayload, PdfParseResult> = {
  run: async (jobId, payload, context?) => {
    if (!context?.queries.fetchFileBuffer) {
      throw new Error("fetchFileBuffer is not configured in WorkflowContext");
    }
    if (!context.queries.parsePdf) {
      throw new Error("parsePdf is not configured in WorkflowContext");
    }

    jobStore.updateStep(jobId, "fetchFile");
    const buffer = await context.queries.fetchFileBuffer(payload.objectKey);

    jobStore.updateStep(jobId, "parsePdf");
    const pages = await context.queries.parsePdf(buffer, payload.options);

    const result: PdfParseResult = { kind: "pdfParse", pageCount: pages.length, pages };
    jobStore.complete(jobId, result);
    return result;
  },
};
