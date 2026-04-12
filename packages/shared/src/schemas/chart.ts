import { z } from "zod";

export const ChartDatasetSchema = z.object({
  label: z.string(),
  data: z.array(z.number()),
  color: z.string().optional(),
});
export type ChartDataset = z.infer<typeof ChartDatasetSchema>;

export const ChartCreateInputSchema = z.object({
  chartType: z.enum(["bar", "line", "pie", "doughnut", "radar", "scatter"]),
  title: z.string().optional(),
  labels: z.array(z.string()),
  datasets: z.array(ChartDatasetSchema),
  width: z.number().optional(),
  height: z.number().optional(),
});
export type ChartCreateInput = z.infer<typeof ChartCreateInputSchema>;

export const ChartCreateResultSchema = z.object({
  kind: z.literal("chartCreate"),
  objectKey: z.string(),
  downloadUrl: z.string(),
});
export type ChartCreateResult = z.infer<typeof ChartCreateResultSchema>;
