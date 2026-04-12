import type { WorkflowContext } from "@dx-template/workflow";
import { parseXlsxBuffer } from "@dx-template/shared";
import { getFileBuffer } from "./s3.js";

export function createWorkflowContext(): WorkflowContext {
  return {
    queries: {
      fetchFileBuffer: getFileBuffer,
      parseXlsx: parseXlsxBuffer,
    },
  };
}
