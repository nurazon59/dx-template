import { tool } from "ai";
import { z } from "zod";
import {
  type WorkflowContext,
  type XlsxParseResult,
  dispatch,
  jobStore,
} from "@dx-template/workflow";

export const xlsxParseTool = (context: WorkflowContext) =>
  tool({
    description: "アップロード済みのExcelファイル(.xlsx)を読み取り、構造化データとして返す",
    inputSchema: z.object({
      objectKey: z.string().describe("S3上のxlsxファイルのobjectKey"),
      sheetName: z.string().optional().describe("読み取り対象のシート名（省略時は全シート）"),
    }),
    execute: async ({ objectKey, sheetName }) => {
      const payload = { objectKey, options: sheetName ? { sheetName } : undefined };
      const { jobId } = await dispatch("xlsxParse", payload, context);
      const job = jobStore.get(jobId);
      const result = job?.result as XlsxParseResult;
      return { workflow: "xlsxParse" as const, ...result };
    },
  });
