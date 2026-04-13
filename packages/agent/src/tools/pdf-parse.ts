import { tool } from "ai";
import { z } from "zod";
import {
  type WorkflowContext,
  type PdfParseResult,
  dispatch,
  jobStore,
} from "@dx-template/workflow";

export const pdfParseTool = (context: WorkflowContext) =>
  tool({
    description: "アップロード済みのPDFファイルを読み取り、ページごとのテキストとして返す",
    inputSchema: z.object({
      objectKey: z.string().describe("S3上のPDFファイルのobjectKey"),
      pages: z.array(z.number()).optional().describe("抽出対象ページ番号（省略時は全ページ）"),
    }),
    execute: async ({ objectKey, pages }) => {
      const payload = { objectKey, options: pages ? { pages } : undefined };
      const { jobId } = await dispatch("pdfParse", payload, context);
      const job = jobStore.get(jobId);
      const result = job?.result as PdfParseResult;
      return { workflow: "pdfParse" as const, ...result };
    },
  });
