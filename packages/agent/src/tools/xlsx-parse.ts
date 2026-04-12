import { tool } from "ai";
import { z } from "zod";
import {
  type WorkflowContext,
  type XlsxParseResult,
  dispatch,
  jobStore,
} from "@dx-template/workflow";
import type { AgentRunResult, AgentToolTrace, AgentWorkflowResult } from "../types.js";

type SetWorkflow = (workflow: AgentRunResult["workflow"], result: AgentWorkflowResult) => void;

export const xlsxParseTool = (
  context: WorkflowContext,
  state: { message: string; setWorkflow: SetWorkflow; toolTrace: AgentToolTrace[] },
) =>
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
      state.setWorkflow("xlsxParse", result);
      state.toolTrace.push({
        toolName: "parseXlsx",
        workflow: "xlsxParse",
        input: { objectKey, sheetName },
        output: result,
      });
      return result;
    },
  });
