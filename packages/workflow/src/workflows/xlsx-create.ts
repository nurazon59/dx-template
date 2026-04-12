import { z } from "zod";
import { XlsxCreateResultSchema } from "@dx-template/shared";
import type { XlsxCreateResult, XlsxCreateSheetInput } from "@dx-template/shared";
import type { Workflow } from "../types.js";
import { jobStore } from "../runner.js";

export const XlsxCreateWorkflowPayloadSchema = z.object({
  sheets: z.array(z.any()),
  fileName: z.string(),
});
export type XlsxCreateWorkflowPayload = {
  sheets: XlsxCreateSheetInput[];
  fileName: string;
};

export { XlsxCreateResultSchema };
export type { XlsxCreateResult };

export const xlsxCreateWorkflow: Workflow<XlsxCreateWorkflowPayload, XlsxCreateResult> = {
  run: async (jobId, payload, context?) => {
    if (!context?.queries.buildXlsx) {
      throw new Error("buildXlsx is not configured in WorkflowContext");
    }
    if (!context.queries.storeFileBuffer) {
      throw new Error("storeFileBuffer is not configured in WorkflowContext");
    }

    jobStore.updateStep(jobId, "buildXlsx");
    const buffer = await context.queries.buildXlsx(payload.sheets);

    jobStore.updateStep(jobId, "storeFile");
    const objectKey = await context.queries.storeFileBuffer(
      buffer,
      payload.fileName,
      // OOXML MIME タイプを明示してS3のContent-Typeを正しく設定する
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    // downloadUrl は server 側でpresign URLを付与するため空文字列で返す
    const result: XlsxCreateResult = { kind: "xlsxCreate", objectKey, downloadUrl: "" };
    jobStore.complete(jobId, result);
    return result;
  },
};
