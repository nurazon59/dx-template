import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { parseXlsxBuffer } from "./xlsx.js";

async function createTestXlsx(
  sheets: { name: string; headers: string[]; rows: unknown[][] }[],
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sheet.name);
    ws.addRow(sheet.headers);
    for (const row of sheet.rows) {
      ws.addRow(row);
    }
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

describe("parseXlsxBuffer", () => {
  it("単一シートのヘッダーとデータを正しくパースする", async () => {
    const buffer = await createTestXlsx([
      { name: "Sheet1", headers: ["名前", "年齢"], rows: [["田中", 30], ["鈴木", 25]] },
    ]);

    const result = await parseXlsxBuffer(buffer);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Sheet1");
    expect(result[0].headers).toEqual(["名前", "年齢"]);
    expect(result[0].rowCount).toBe(2);
    expect(result[0].data).toEqual([
      { "名前": "田中", "年齢": 30 },
      { "名前": "鈴木", "年齢": 25 },
    ]);
  });

  it("sheetName オプションで特定シートのみ抽出する", async () => {
    const buffer = await createTestXlsx([
      { name: "売上", headers: ["月", "金額"], rows: [["1月", 100]] },
      { name: "経費", headers: ["項目", "金額"], rows: [["交通費", 50]] },
    ]);

    const result = await parseXlsxBuffer(buffer, { sheetName: "経費" });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("経費");
    expect(result[0].data).toEqual([{ "項目": "交通費", "金額": 50 }]);
  });

  it("headerRow オプションでヘッダー行を指定できる", async () => {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("Sheet1");
    ws.addRow(["タイトル行（スキップ）"]);
    ws.addRow(["名前", "値"]);
    ws.addRow(["A", 1]);
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const result = await parseXlsxBuffer(buffer, { headerRow: 2 });

    expect(result[0].headers).toEqual(["名前", "値"]);
    expect(result[0].data).toEqual([{ "名前": "A", "値": 1 }]);
  });

  it("空行をスキップする", async () => {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("Sheet1");
    ws.addRow(["名前"]);
    ws.addRow(["田中"]);
    ws.addRow([]);
    ws.addRow(["鈴木"]);
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const result = await parseXlsxBuffer(buffer);

    expect(result[0].rowCount).toBe(2);
    expect(result[0].data).toEqual([{ "名前": "田中" }, { "名前": "鈴木" }]);
  });
});
