import { describe, expect, it } from "vitest";
import { triageWorkflow } from "./triage.js";

describe("triageWorkflow", () => {
  it("transport 非依存の triage 結果を返す", async () => {
    const result = await triageWorkflow.run(
      {
        message: "週次レポートを作って",
        intent: "report",
        summary: "週次レポート作成の依頼",
      },
      { queries: {} },
    );

    expect(result).toEqual({
      kind: "triage",
      intent: "report",
      summary: "週次レポート作成の依頼",
      nextAction: "report workflow の要件が固まったら、入力収集とレポート生成に進みます。",
    });
  });
});
