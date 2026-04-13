import { tool } from "ai";
import { z } from "zod";
import {
  type WorkflowContext,
  type XlsxCreateResult,
  dispatch,
  jobStore,
} from "@dx-template/workflow";

export const xlsxCreateTool = (context: WorkflowContext) =>
  tool({
    description: "データからExcelファイル(.xlsx)を作成し、S3に保存してダウンロードURLを返す",
    inputSchema: z.object({
      fileName: z.string().describe("作成するxlsxファイル名（例: report.xlsx）"),
      sheets: z
        .array(
          z.object({
            name: z.string().describe("シート名"),
            headers: z.array(z.string()).describe("ヘッダー行の項目名"),
            data: z
              .array(z.record(z.string(), z.unknown()))
              .describe("行データ（ヘッダー名をキーとするオブジェクトの配列）"),
          }),
        )
        .describe("作成するシートの配列"),
    }),
    execute: async ({ fileName, sheets }) => {
      const payload = { fileName, sheets };
      const { jobId } = await dispatch("xlsxCreate", payload, context);
      const job = jobStore.get(jobId);
      const result = job?.result as XlsxCreateResult;
      return { workflow: "xlsxCreate" as const, ...result };
    },
  });
