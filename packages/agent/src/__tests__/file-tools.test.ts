import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkflowContext } from "@dx-template/workflow";

/**
 * generateText モック: prompt の内容に応じて適切なツールを呼び分ける。
 * 各テストケースが prompt 経由でどのツールを使うか指示する。
 */
vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    generateText: vi.fn(async (options) => {
      const prompt: string = options.prompt;

      // triage は全フローで最初に呼ばれる
      const triageArgs = { intent: "file", summary: prompt };
      const triageResult = await options.tools.runTriage.execute(triageArgs, {} as never);
      const steps: unknown[] = [
        {
          toolCalls: [{ toolCallId: "tc-1", toolName: "runTriage", input: triageArgs }],
          toolResults: [{ toolCallId: "tc-1", toolName: "runTriage", output: triageResult }],
        },
      ];

      let toolResult: unknown;
      let toolName: string;
      let toolArgs: unknown;

      if (prompt.includes("xlsxParse")) {
        toolName = "parseXlsx";
        toolArgs = { objectKey: "uploads/test.xlsx" };
        toolResult = await options.tools.parseXlsx.execute(toolArgs, {} as never);
      } else if (prompt.includes("pdfParse")) {
        toolName = "parsePdf";
        toolArgs = { objectKey: "uploads/test.pdf" };
        toolResult = await options.tools.parsePdf.execute(toolArgs, {} as never);
      } else if (prompt.includes("xlsxCreate")) {
        toolName = "createXlsx";
        toolArgs = {
          fileName: "output.xlsx",
          sheets: [
            {
              name: "Sheet1",
              headers: ["名前", "値"],
              data: [{ 名前: "A", 値: 1 }],
            },
          ],
        };
        toolResult = await options.tools.createXlsx.execute(toolArgs, {} as never);
      } else if (prompt.includes("chartCreate")) {
        toolName = "createChart";
        toolArgs = {
          fileName: "chart.png",
          chartType: "bar",
          title: "売上推移",
          labels: ["1月", "2月", "3月"],
          datasets: [{ label: "売上", data: [100, 200, 300] }],
        };
        toolResult = await options.tools.createChart.execute(toolArgs, {} as never);
      } else {
        throw new Error(`Unknown prompt for file-tools test: ${prompt}`);
      }

      steps.push({
        toolCalls: [{ toolCallId: "tc-2", toolName, input: toolArgs }],
        toolResults: [{ toolCallId: "tc-2", toolName, output: toolResult }],
      });

      return {
        text: `${toolName} を実行しました`,
        totalUsage: { inputTokens: 50, outputTokens: 30, totalTokens: 80 },
        steps,
      };
    }),
    streamText: vi.fn(),
  };
});

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn((model: string) => ({ model })),
}));

vi.mock("@ai-sdk/google", () => ({
  google: vi.fn((model: string) => ({ model })),
}));

vi.mock("../env.js", () => ({
  env: new Proxy({} as Record<string, string | undefined>, {
    get: (_target, prop: string) => process.env[prop],
  }),
}));

import { runAgent } from "../index.js";

function buildContext(queries: WorkflowContext["queries"]): WorkflowContext {
  return { queries };
}

beforeEach(() => {
  process.env["AI_PROVIDER"] = "openai";
  process.env["OPENAI_API_KEY"] = "test-api-key";
  process.env["OPENAI_MODEL"] = "test-model";
});

describe("file-tools E2E", () => {
  it("xlsxParse: triage → parseXlsx でシート構造を返す", async () => {
    const mockSheets = [
      {
        name: "Sheet1",
        headers: ["名前", "値"],
        rows: [
          { 名前: "A", 値: 1 },
          { 名前: "B", 値: 2 },
        ],
      },
    ];

    const context = buildContext({
      fetchFileBuffer: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      parseXlsx: vi.fn().mockResolvedValue(mockSheets),
    });

    const result = await runAgent(
      { message: "xlsxParse", source: "web" },
      context,
      { runId: "run-xlsx-parse" },
    );

    expect(result.runId).toBe("run-xlsx-parse");
    expect(result.workflow).toBe("xlsxParse");
    expect(result.result).toMatchObject({
      kind: "xlsxParse",
      sheets: mockSheets,
    });
    expect(result.trace.tools).toHaveLength(2);
    expect(result.trace.tools[0]!.toolName).toBe("runTriage");
    expect(result.trace.tools[1]!.toolName).toBe("parseXlsx");
    expect(result.trace.tools[1]!.workflow).toBe("xlsxParse");

    expect(context.queries.fetchFileBuffer).toHaveBeenCalledWith("uploads/test.xlsx");
    expect(context.queries.parseXlsx).toHaveBeenCalled();
  });

  it("pdfParse: triage → parsePdf でページ構造を返す", async () => {
    const mockPages = [
      { pageNumber: 1, text: "ページ1の内容" },
      { pageNumber: 2, text: "ページ2の内容" },
    ];

    const context = buildContext({
      fetchFileBuffer: vi.fn().mockResolvedValue(new Uint8Array([4, 5, 6])),
      parsePdf: vi.fn().mockResolvedValue(mockPages),
    });

    const result = await runAgent(
      { message: "pdfParse", source: "web" },
      context,
      { runId: "run-pdf-parse" },
    );

    expect(result.runId).toBe("run-pdf-parse");
    expect(result.workflow).toBe("pdfParse");
    expect(result.result).toMatchObject({
      kind: "pdfParse",
      pageCount: 2,
      pages: mockPages,
    });
    expect(result.trace.tools).toHaveLength(2);
    expect(result.trace.tools[0]!.toolName).toBe("runTriage");
    expect(result.trace.tools[1]!.toolName).toBe("parsePdf");
    expect(result.trace.tools[1]!.workflow).toBe("pdfParse");

    expect(context.queries.fetchFileBuffer).toHaveBeenCalledWith("uploads/test.pdf");
    expect(context.queries.parsePdf).toHaveBeenCalled();
  });

  it("xlsxCreate: triage → createXlsx で objectKey を返す", async () => {
    const context = buildContext({
      buildXlsx: vi.fn().mockResolvedValue(new Uint8Array([10, 20])),
      storeFileBuffer: vi.fn().mockResolvedValue("generated/output.xlsx"),
    });

    const result = await runAgent(
      { message: "xlsxCreate", source: "web" },
      context,
      { runId: "run-xlsx-create" },
    );

    expect(result.runId).toBe("run-xlsx-create");
    expect(result.workflow).toBe("xlsxCreate");
    expect(result.result).toMatchObject({
      kind: "xlsxCreate",
      objectKey: "generated/output.xlsx",
    });
    expect(result.trace.tools).toHaveLength(2);
    expect(result.trace.tools[0]!.toolName).toBe("runTriage");
    expect(result.trace.tools[1]!.toolName).toBe("createXlsx");
    expect(result.trace.tools[1]!.workflow).toBe("xlsxCreate");

    expect(context.queries.buildXlsx).toHaveBeenCalled();
    expect(context.queries.storeFileBuffer).toHaveBeenCalledWith(
      new Uint8Array([10, 20]),
      "output.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  });

  it("chartCreate: triage → createChart で objectKey を返す", async () => {
    const context = buildContext({
      buildChart: vi.fn().mockResolvedValue(new Uint8Array([30, 40])),
      storeFileBuffer: vi.fn().mockResolvedValue("generated/chart.png"),
    });

    const result = await runAgent(
      { message: "chartCreate", source: "web" },
      context,
      { runId: "run-chart-create" },
    );

    expect(result.runId).toBe("run-chart-create");
    expect(result.workflow).toBe("chartCreate");
    expect(result.result).toMatchObject({
      kind: "chartCreate",
      objectKey: "generated/chart.png",
    });
    expect(result.trace.tools).toHaveLength(2);
    expect(result.trace.tools[0]!.toolName).toBe("runTriage");
    expect(result.trace.tools[1]!.toolName).toBe("createChart");
    expect(result.trace.tools[1]!.workflow).toBe("chartCreate");

    expect(context.queries.buildChart).toHaveBeenCalled();
    expect(context.queries.storeFileBuffer).toHaveBeenCalledWith(
      new Uint8Array([30, 40]),
      "chart.png",
      "image/png",
    );
  });
});
