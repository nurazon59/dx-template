import { describe, expect, it } from "vitest";
import { dispatch, jobStore } from "../registry.js";

describe("reportWorkflow", () => {
  it("dispatch で report を実行し結果を jobStore に格納する", async () => {
    const { jobId } = await dispatch("report", {
      message: "週次レポートを作って",
      title: "週次レポート草案",
      summary: "今週の進捗と論点を整理する",
      audience: "事業企画部",
    });

    const job = jobStore.get(jobId);
    expect(job?.status).toBe("done");
    expect(job?.result).toMatchObject({
      kind: "reportDraft",
      title: "週次レポート草案",
      audience: "事業企画部",
      summary: "今週の進捗と論点を整理する",
      outline: ["目的", "現状", "論点", "次アクション"],
      nextAction: "必要なデータソース、提出形式、締切を確認します。",
    });
    const result = job!.result as { draft: string };
    expect(result.draft).toContain("# 週次レポート草案");
  });
});
