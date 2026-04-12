import { z } from "zod";
import { ChartCreateInputSchema, ChartCreateResultSchema } from "@dx-template/shared";
import type { ChartCreateInput, ChartCreateResult } from "@dx-template/shared";
import type { Workflow } from "../types.js";
import { jobStore } from "../runner.js";

export const ChartCreateWorkflowPayloadSchema = z.object({
  chart: ChartCreateInputSchema,
  fileName: z.string(),
});
export type ChartCreateWorkflowPayload = {
  chart: ChartCreateInput;
  fileName: string;
};

export { ChartCreateResultSchema };
export type { ChartCreateResult };

export const chartCreateWorkflow: Workflow<ChartCreateWorkflowPayload, ChartCreateResult> = {
  run: async (jobId, payload, context?) => {
    if (!context?.queries.buildChart) {
      throw new Error("buildChart is not configured in WorkflowContext");
    }
    if (!context.queries.storeFileBuffer) {
      throw new Error("storeFileBuffer is not configured in WorkflowContext");
    }

    jobStore.updateStep(jobId, "buildChart");
    const buffer = await context.queries.buildChart(payload.chart);

    jobStore.updateStep(jobId, "storeFile");
    const objectKey = await context.queries.storeFileBuffer(buffer, payload.fileName, "image/png");

    const result: ChartCreateResult = { kind: "chartCreate", objectKey, downloadUrl: "" };
    jobStore.complete(jobId, result);
    return result;
  },
};
