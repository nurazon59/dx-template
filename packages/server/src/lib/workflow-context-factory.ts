import type { WorkflowContext } from "@dx-template/workflow";
import {
  parseXlsxBuffer,
  parsePdfBuffer,
  buildXlsxBuffer,
  buildChartBuffer,
} from "@dx-template/shared";
import { getFileBuffer, putFileBuffer } from "./s3.js";
import { search as searchFiles } from "../repositories/files.js";
import type { Database } from "./context.js";

export function createWorkflowContext(options?: {
  db?: Database;
  userId?: string;
}): WorkflowContext {
  const { db, userId } = options ?? {};
  return {
    userId,
    queries: {
      fetchFileBuffer: getFileBuffer,
      storeFileBuffer: putFileBuffer,
      parseXlsx: parseXlsxBuffer,
      parsePdf: parsePdfBuffer,
      buildXlsx: buildXlsxBuffer,
      buildChart: buildChartBuffer,
      searchFiles: db ? (params) => searchFiles(db, params) : undefined,
    },
  };
}
