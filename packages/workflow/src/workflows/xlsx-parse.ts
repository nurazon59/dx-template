import { z } from "zod";
import { XlsxParseOptionsSchema, XlsxParseResultSchema } from "@dx-template/shared";
import type { XlsxParseResult } from "@dx-template/shared";
import type { Workflow } from "../types.js";
import { jobStore } from "../runner.js";

export const XlsxParseWorkflowPayloadSchema = z.object({
  objectKey: z.string(),
  options: XlsxParseOptionsSchema.optional(),
});
export type XlsxParseWorkflowPayload = z.infer<typeof XlsxParseWorkflowPayloadSchema>;

export { XlsxParseResultSchema };
export type { XlsxParseResult };

export const xlsxParseWorkflow: Workflow<XlsxParseWorkflowPayload, XlsxParseResult> = {
  run: async (jobId, payload, context?) => {
    if (!context?.queries.fetchFileBuffer) {
      throw new Error("fetchFileBuffer is not configured in WorkflowContext");
    }
    if (!context.queries.parseXlsx) {
      throw new Error("parseXlsx is not configured in WorkflowContext");
    }

    jobStore.updateStep(jobId, "fetchFile");
    const buffer = await context.queries.fetchFileBuffer(payload.objectKey);

    jobStore.updateStep(jobId, "parseXlsx");
    const sheets = await context.queries.parseXlsx(buffer, payload.options);

    const result: XlsxParseResult = { kind: "xlsxParse", sheets };
    jobStore.complete(jobId, result);
    return result;
  },
};
