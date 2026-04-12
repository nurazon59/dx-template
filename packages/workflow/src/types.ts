import type {
  XlsxParseOptions,
  XlsxSheet,
  XlsxCreateSheetInput,
  PdfParseOptions,
  PdfPage,
  ChartCreateInput,
} from "@dx-template/shared";

export interface WorkflowContext {
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
  };
}

export interface Job {
  jobId: string;
  workflowType: string;
  status: "running" | "done" | "failed" | "suspended";
  currentStep: string;
  payload: unknown;
  result?: unknown;
  error?: string;
  suspendedStepIndex?: number;
  suspendedCtx?: unknown;
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
