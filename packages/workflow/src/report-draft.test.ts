import { describe, expect, it } from "vitest";
import { reportDraftWorkflow } from "./report-draft.js";

describe("reportDraftWorkflow", () => {
  it("transport 非依存の report draft を返す", async () => {
    const result = await reportDraftWorkflow.run(
      {
        message: "週次レポートを作って",
        title: "週次レポート草案",
        summary: "今週の進捗と論点を整理する",
        audience: "事業企画部",
      },
      { queries: {} },
    );

    expect(result).toMatchObject({
      kind: "reportDraft",
      title: "週次レポート草案",
      audience: "事業企画部",
      summary: "今週の進捗と論点を整理する",
      outline: ["目的", "現状", "論点", "次アクション"],
      nextAction: "必要なデータソース、提出形式、締切を確認します。",
    });
    expect(result.draft).toContain("# 週次レポート草案");
  });
});
