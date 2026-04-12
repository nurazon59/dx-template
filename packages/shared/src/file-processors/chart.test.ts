import { describe, expect, it } from "vitest";
import { buildChartBuffer } from "./chart.js";
import type { ChartCreateInput } from "../schemas/chart.js";

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47];

const baseInput: ChartCreateInput = {
  chartType: "bar",
  labels: ["1月", "2月", "3月"],
  datasets: [{ label: "売上", data: [100, 200, 150] }],
};

describe("buildChartBuffer", () => {
  it("PNGヘッダを持つUint8Arrayを返す", async () => {
    const buffer = await buildChartBuffer(baseInput);

    expect(buffer).toBeInstanceOf(Uint8Array);
    expect(buffer.length).toBeGreaterThan(0);
    expect(Array.from(buffer.slice(0, 4))).toEqual(PNG_HEADER);
  });

  it("タイトル付きで生成できる", async () => {
    const buffer = await buildChartBuffer({ ...baseInput, title: "月次売上" });

    expect(Array.from(buffer.slice(0, 4))).toEqual(PNG_HEADER);
  });

  it("width/heightを指定できる", async () => {
    const buffer = await buildChartBuffer({ ...baseInput, width: 400, height: 300 });

    expect(Array.from(buffer.slice(0, 4))).toEqual(PNG_HEADER);
  });

  it.each(["bar", "line", "pie", "doughnut", "radar", "scatter"] as const)(
    "%s タイプで生成できる",
    async (chartType) => {
      const input: ChartCreateInput = {
        ...baseInput,
        chartType,
        // scatter は {x, y} 形式だがnumber[]でもChart.jsは動作する
      };
      const buffer = await buildChartBuffer(input);

      expect(Array.from(buffer.slice(0, 4))).toEqual(PNG_HEADER);
    },
  );

  it("複数データセットで生成できる", async () => {
    const buffer = await buildChartBuffer({
      ...baseInput,
      datasets: [
        { label: "売上", data: [100, 200, 150] },
        { label: "経費", data: [80, 120, 90], color: "#ff0000" },
      ],
    });

    expect(Array.from(buffer.slice(0, 4))).toEqual(PNG_HEADER);
  });
});
