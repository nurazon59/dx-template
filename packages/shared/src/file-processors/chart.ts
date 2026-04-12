import { createCanvas } from "@napi-rs/canvas";
import { Chart, registerables } from "chart.js";
import type { ChartConfiguration } from "chart.js";
import type { ChartCreateInput } from "../schemas/chart.js";

Chart.register(...registerables);

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

const DEFAULT_COLORS = [
  "#4dc9f6",
  "#f67019",
  "#f53794",
  "#537bc4",
  "#acc236",
  "#166a8f",
  "#00a950",
  "#58595b",
  "#8549ba",
];

export async function buildChartBuffer(input: ChartCreateInput): Promise<Uint8Array> {
  const width = input.width ?? DEFAULT_WIDTH;
  const height = input.height ?? DEFAULT_HEIGHT;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // 白背景
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);

  const datasets = input.datasets.map((ds, i) => ({
    label: ds.label,
    data: ds.data,
    backgroundColor: ds.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
    borderColor: ds.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
  }));

  const configuration: ChartConfiguration = {
    type: input.chartType,
    data: {
      labels: input.labels,
      datasets,
    },
    options: {
      animation: false,
      plugins: {
        title: input.title ? { display: true, text: input.title } : undefined,
      },
    },
  };

  // @napi-rs/canvas は Chart.js の Canvas 互換だが型定義が完全一致しない
  new Chart(ctx as unknown as CanvasRenderingContext2D, configuration);

  const pngBuffer = await canvas.encode("png");
  return new Uint8Array(pngBuffer);
}
