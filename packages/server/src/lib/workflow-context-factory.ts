import type { WorkflowContext } from "@dx-template/workflow";
import { parseXlsxBuffer, parsePdfBuffer, buildXlsxBuffer } from "@dx-template/shared";
import { getFileBuffer, putFileBuffer } from "./s3.js";

export function createWorkflowContext(): WorkflowContext {
  return {
    queries: {
      fetchFileBuffer: getFileBuffer,
      storeFileBuffer: putFileBuffer,
      parseXlsx: parseXlsxBuffer,
      parsePdf: parsePdfBuffer,
      buildXlsx: buildXlsxBuffer,
    },
  };
}
