import type {
  XlsxParseOptions,
  XlsxSheet,
  XlsxCreateSheetInput,
  PdfParseOptions,
  PdfPage,
  ChartCreateInput,
} from "@dx-template/shared";

export interface FileSearchResult {
  id: string;
  objectKey: string;
  fileName: string;
  contentType: string;
  contentLength: number;
  createdAt: Date;
}

export interface WorkflowContext {
  userId?: string;
  queries: {
    fetchFileBuffer?: (objectKey: string) => Promise<Uint8Array>;
    storeFileBuffer?: (
      buffer: Uint8Array,
      fileName: string,
      contentType: string,
    ) => Promise<string>;
    parseXlsx?: (buffer: Uint8Array, options?: XlsxParseOptions) => Promise<XlsxSheet[]>;
    buildXlsx?: (sheets: XlsxCreateSheetInput[]) => Promise<Uint8Array>;
    parsePdf?: (buffer: Uint8Array, options?: PdfParseOptions) => Promise<PdfPage[]>;
    buildChart?: (input: ChartCreateInput) => Promise<Uint8Array>;
    searchFiles?: (params: {
      query?: string;
      contentType?: string;
      userId: string;
    }) => Promise<FileSearchResult[]>;
  };
}

export interface PendingApprovalData {
  approvalId: string;
  toolCallId: string;
  toolName: string;
  toolArgs: unknown;
  messages: unknown[];
}

export interface Job {
  jobId: string;
  workflowType: string;
  status: "running" | "done" | "failed" | "suspended" | "pending-approval";
  currentStep: string;
  payload: unknown;
  result?: unknown;
  error?: string;
  suspendedStepIndex?: number;
  suspendedCtx?: unknown;
  pendingApproval?: PendingApprovalData;
  createdAt: string;
  updatedAt: string;
}

export interface StepEntry {
  name: string;
  execute: (input: unknown) => Promise<unknown>;
}

export interface Workflow<TPayload = unknown, TResult = unknown> {
  run: (jobId: string, payload: TPayload, context?: WorkflowContext) => Promise<TResult>;
}

/** ステップ内で throw して中断を宣言 */
export class Suspend {
  constructor(public readonly data?: unknown) {}
}
