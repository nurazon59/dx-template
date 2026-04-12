import { tool } from "ai";
import { z } from "zod";
import {
  type WorkflowContext,
  type ChartCreateResult,
  dispatch,
  jobStore,
} from "@dx-template/workflow";
import type { AgentRunResult, AgentToolTrace, AgentWorkflowResult } from "../types.js";

type SetWorkflow = (workflow: AgentRunResult["workflow"], result: AgentWorkflowResult) => void;

export const chartCreateTool = (
  context: WorkflowContext,
  state: { message: string; setWorkflow: SetWorkflow; toolTrace: AgentToolTrace[] },
) =>
  tool({
    description:
      "データからチャート画像(PNG)を作成し、S3に保存してダウンロードURLを返す。棒グラフ・折れ線・円・ドーナツ・レーダー・散布図に対応",
    inputSchema: z.object({
      fileName: z.string().describe("作成するPNGファイル名（例: sales-chart.png）"),
      chartType: z
        .enum(["bar", "line", "pie", "doughnut", "radar", "scatter"])
        .describe("チャートの種類"),
      title: z.string().optional().describe("チャートのタイトル"),
      labels: z.array(z.string()).describe("X軸のラベル（カテゴリ名の配列）"),
      datasets: z
        .array(
          z.object({
            label: z.string().describe("データセットのラベル（凡例に表示）"),
            data: z.array(z.number()).describe("数値データの配列"),
            color: z.string().optional().describe("色（CSSカラー）"),
          }),
        )
        .describe("データセットの配列"),
      width: z.number().optional().describe("画像の幅（px、デフォルト800）"),
      height: z.number().optional().describe("画像の高さ（px、デフォルト600）"),
    }),
    execute: async ({ fileName, chartType, title, labels, datasets, width, height }) => {
      const chart = { chartType, title, labels, datasets, width, height };
      const payload = { chart, fileName };
      const { jobId } = await dispatch("chartCreate", payload, context);
      const job = jobStore.get(jobId);
      const result = job?.result as ChartCreateResult;
      state.setWorkflow("chartCreate", result);
      state.toolTrace.push({
        toolName: "createChart",
        workflow: "chartCreate",
        input: { fileName, chartType },
        output: result,
      });
      return result;
    },
  });
