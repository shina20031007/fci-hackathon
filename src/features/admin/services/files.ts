import { PDFParse } from "pdf-parse";
import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";
import { XMLParser } from "fast-xml-parser";
import type { PageText } from "../types/extraction";
export const MAX_FILE_BYTES = 3 * 1024 * 1024;
export async function pdfPages(data: Buffer): Promise<PageText[]> {
  if (data.subarray(0, 5).toString() !== "%PDF-")
    throw new Error("The file is not a valid PDF.");
  const parser = new PDFParse({ data: new Uint8Array(data) });
  try {
    const result = await parser.getText();
    if (result.total > 150) throw new Error("PDF exceeds the 150-page limit.");
    const pages = result.pages.map((p) => ({ page: p.num, text: p.text }));
    if (pages.some((p) => p.text.trim().length < 20))
      throw new Error(
        "One or more PDF pages have insufficient readable text. Upload a text-accessible PDF; scanned pages require OCR before import.",
      );
    if (pages.reduce((sum, p) => sum + p.text.length, 0) > 180000)
      throw new Error(
        "PDF exceeds the analysis text limit. Split it by agenda item.",
      );
    return pages;
  } finally {
    await parser.destroy();
  }
}
const cellText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const v = value as {
      text?: string;
      richText?: { text: string }[];
      result?: unknown;
    };
    return (
      v.text ??
      v.richText?.map((x) => x.text).join("") ??
      String(v.result ?? "")
    );
  }
  return String(value);
};
export async function structuredRecords(
  data: Buffer,
  extension: string,
): Promise<Record<string, string>[]> {
  let rows: unknown;
  if (extension === "csv")
    rows = parse(data, {
      columns: true,
      bom: true,
      skip_empty_lines: true,
      max_record_size: 100000,
    });
  else if (extension === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(data as never);
    const sheet = workbook.getWorksheet("Main Data") ?? workbook.worksheets[0];
    if (!sheet || sheet.rowCount > 60000)
      throw new Error("Unsupported spreadsheet size.");
    const headers = (sheet.getRow(1).values as unknown[])
      .slice(1)
      .map((v) => cellText(v).replace(/\s+/g, " ").trim());
    const records: Record<string, string>[] = [];
    sheet.eachRow((row, index) => {
      if (index > 1)
        records.push(
          Object.fromEntries(
            headers
              .map((header, i) => [header, cellText(row.getCell(i + 1).value)])
              .filter(([header]) => header),
          ),
        );
    });
    return records;
  } else if (extension === "json") rows = JSON.parse(data.toString());
  else if (extension === "xml") {
    const text = data.toString();
    if (/<!DOCTYPE|<!ENTITY/i.test(text))
      throw new Error("XML entities are not supported.");
    rows = new XMLParser({
      processEntities: false,
      ignoreAttributes: true,
    }).parse(text);
  } else throw new Error("Supported formats: PDF, CSV, XLSX, JSON and XML.");
  const find = (value: unknown): unknown[] | null => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      const object = value as Record<string, unknown>;
      if (Array.isArray(object.records)) return object.records;
      if (object.result) {
        const result = find(object.result);
        if (result) return result;
      }
      for (const child of Object.values(value)) {
        const result = find(child);
        if (result) return result;
      }
    }
    return null;
  };
  const records = find(rows);
  if (!records || records.length > 60000)
    throw new Error("No supported record array was found.");
  return records.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row))
      throw new Error("Invalid structured record.");
    return Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k, cellText(v)]),
    );
  });
}
