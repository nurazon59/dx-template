import { describe, expect, it, vi } from "vitest";
import type { WorkflowContext } from "../types.js";
import { dispatch, jobStore } from "../registry.js";

describe("chartCreateWorkflow", () => {
  function createMockContext(): WorkflowContext {
    return {
      queries: {
        buildChart: vi.fn().mockResolvedValue(new Uint8Array([0x89, 0x50, 0x4e, 0x47])),
        storeFileBuffer: vi.fn().mockResolvedValue("uploads/files/test/chart.png"),
      },
    };
  }

  const testChart = {
    chartType: "bar" as const,
    labels: ["1月", "2月"],
    datasets: [{ label: "売上", data: [100, 200] }],
  };

  it("buildChart → storeFileBuffer の順で実行し結果を jobStore に格納する", async () => {
    const context = createMockContext();
    const { jobId } = await dispatch(
      "chartCreate",
      { chart: testChart, fileName: "chart.png" },
      context,
    );

    const job = jobStore.get(jobId);
    expect(job?.status).toBe("done");
    expect(job?.result).toEqual({
      kind: "chartCreate",
      objectKey: "uploads/files/test/chart.png",
      downloadUrl: "",
    });
    expect(context.queries.buildChart).toHaveBeenCalledWith(testChart);
    expect(context.queries.storeFileBuffer).toHaveBeenCalledWith(
      new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      "chart.png",
      "image/png",
    );
  });

  it("buildChart 未設定時にエラーを投げる", async () => {
    await expect(
      dispatch("chartCreate", { chart: testChart, fileName: "chart.png" }, { queries: {} }),
    ).rejects.toThrow("buildChart is not configured");
  });

  it("storeFileBuffer 未設定時にエラーを投げる", async () => {
    const context: WorkflowContext = {
      queries: { buildChart: vi.fn().mockResolvedValue(new Uint8Array()) },
    };
    await expect(
      dispatch("chartCreate", { chart: testChart, fileName: "chart.png" }, context),
    ).rejects.toThrow("storeFileBuffer is not configured");
  });
});
