import ExcelJS from "exceljs";
import type { XlsxCreateSheetInput, XlsxParseOptions, XlsxSheet } from "../schemas/xlsx.js";

export async function parseXlsxBuffer(
  buffer: Uint8Array,
  options?: XlsxParseOptions,
): Promise<XlsxSheet[]> {
  const workbook = new ExcelJS.Workbook();
  // ExcelJS の型定義が古い Buffer 型を要求するため型アサーションが必要
  await workbook.xlsx.load(Buffer.from(buffer) as unknown as ExcelJS.Buffer);

  const targetSheets = options?.sheetName
    ? workbook.worksheets.filter((ws) => ws.name === options.sheetName)
    : workbook.worksheets;

  return targetSheets.map((worksheet) => {
    const headerRowIndex = options?.headerRow ?? 1;
    const headerRow = worksheet.getRow(headerRowIndex);
    const headers: string[] = [];

    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value ?? "");
    });

    const data: Record<string, unknown>[] = [];
    for (let rowIndex = headerRowIndex + 1; rowIndex <= worksheet.rowCount; rowIndex++) {
      const row = worksheet.getRow(rowIndex);
      if (row.values === undefined || (Array.isArray(row.values) && row.values.length <= 1)) {
        continue;
      }

      const record: Record<string, unknown> = {};
      let hasValue = false;
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          record[header] = cell.value;
          hasValue = true;
        }
      });

      if (hasValue) {
        data.push(record);
      }
    }

    return {
      name: worksheet.name,
      headers: headers.filter(Boolean),
      rowCount: data.length,
      data,
    };
  });
}

export async function buildXlsxBuffer(sheets: XlsxCreateSheetInput[]): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);
    worksheet.addRow(sheet.headers);

    for (const record of sheet.data) {
      const row = sheet.headers.map((header) => record[header] ?? null);
      worksheet.addRow(row);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}
