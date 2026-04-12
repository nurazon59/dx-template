import { describe, expect, it } from "vitest";
import { dispatch, jobStore } from "../registry.js";

describe("triageWorkflow", () => {
  it("dispatch で triage を実行し結果を jobStore に格納する", async () => {
    const { jobId } = await dispatch("triage", {
      message: "週次レポートを作って",
      intent: "report",
      summary: "週次レポート作成の依頼",
    });

    const job = jobStore.get(jobId);
    expect(job?.status).toBe("done");
    expect(job?.result).toEqual({
      kind: "triage",
      intent: "report",
      summary: "週次レポート作成の依頼",
      nextAction: "report workflow の要件が固まったら、入力収集とレポート生成に進みます。",
    });
  });
});
