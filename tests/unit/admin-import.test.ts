import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import {
  structuredRecords,
  pdfPages,
} from "../../src/features/admin/services/files";
import {
  checkQuotes,
  groundExtraction,
  matchCitation,
  fieldNames,
  type Extraction,
} from "../../src/features/admin/types/extraction";
import { originError } from "../../src/features/admin/services/auth";
const extracted = (): Extraction => ({
  fields: fieldNames.map((name) => ({
    name,
    value: null,
    page: null,
    quote: null,
  })),
  events: [],
  warnings: [],
});
describe("document import safety and ordinary structured parsing", () => {
  it("matches typography and physical pages without accepting changed facts or ambiguous locations", () => {
    const pages = [
      {
        page: 3,
        text: "Council’s office did not approve 20 studies.\nYears 2024-\n2025.",
      },
    ];
    expect(
      matchCitation("Council's office did not approve 20 studies.", 3, pages)
        .kind,
    ).toBe("Typography / whitespace match");
    expect(
      matchCitation("Council’s office did not approve 20 studies.", 1, pages),
    ).toEqual({ page: 3, kind: "Different PDF page" });
    for (const quote of [
      "office did approve 20 studies",
      "office did not approve 21 studies",
      "Years 2024-2025.",
      "Council … approve 20 studies.",
    ])
      expect(matchCitation(quote, 3, pages).page).toBeNull();
    expect(
      matchCitation("Council’s office", 1, [...pages, { ...pages[0], page: 4 }])
        .kind,
    ).toBe("Ambiguous page");
    expect(matchCitation("Years 2024-\n2025.", 3, pages).page).toBe(3);
  });
  it("withholds unsupported AI values and repairs only unique exact page matches", () => {
    const data = extracted();
    data.fields[0] = {
      name: "title",
      value: "Title",
      page: 9,
      quote: "The original report title",
    };
    data.fields[1] = {
      name: "municipality",
      value: "Invented city",
      page: 1,
      quote: "An invented quotation",
    };
    const grounded = groundExtraction(data, [
      { page: 1, text: "The original report title" },
    ]);
    expect(grounded.fields[0].page).toBe(1);
    expect(grounded.fields[1].value).toBeNull();
    expect(grounded.warnings).toHaveLength(2);
    expect(data.fields[1].value).toBe("Invented city");
  });
  it("matches source quotations to exact page text and rejects missing fields", () => {
    const data = extracted();
    data.fields[0] = {
      name: "title",
      value: "Test report",
      page: 1,
      quote: "The original report title",
    };
    expect(() =>
      checkQuotes(data, [
        { page: 1, text: "The original report title\nFurther text." },
      ]),
    ).not.toThrow();
    expect(() =>
      checkQuotes(data, [{ page: 2, text: "The original report title" }]),
    ).toThrow("does not match");
    data.fields[0].quote = "An invented quote";
    expect(() =>
      checkQuotes(data, [{ page: 1, text: "The original report title" }]),
    ).toThrow();
    const missing = extracted();
    missing.fields.pop();
    expect(() => checkQuotes(missing, [])).toThrow("Missing");
  });
  it("parses CSV, CKAN JSON and XML without AI and rejects XML entities", async () => {
    expect(
      (
        await structuredRecords(
          Buffer.from("Item Number,Status\n2024.EX11.8,Closed"),
          "csv",
        )
      )[0].Status,
    ).toBe("Closed");
    expect(
      (
        await structuredRecords(
          Buffer.from(
            JSON.stringify({
              result: {
                fields: [{ id: "wrong" }],
                records: [{ "Agenda Item #": "2024.EX11.8", Vote: "Yes" }],
              },
            }),
          ),
          "json",
        )
      )[0].Vote,
    ).toBe("Yes");
    expect(
      await structuredRecords(
        Buffer.from(
          "<rows><row><item>A</item></row><row><item>B</item></row></rows>",
        ),
        "xml",
      ),
    ).toHaveLength(2);
    await expect(
      structuredRecords(
        Buffer.from(
          '<!DOCTYPE foo [<!ENTITY x SYSTEM "file:///etc/passwd">]><row>&x;</row>',
        ),
        "xml",
      ),
    ).rejects.toThrow("entities");
    await expect(pdfPages(Buffer.from("not a PDF"))).rejects.toThrow(
      "valid PDF",
    );
  });
  it("uses actual XLSX column positions and hyperlink labels", async () => {
    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet("Main Data");
    sheet.addRow(["Item Number", null, "Agenda title"]);
    sheet.addRow([
      "2024.EX11.8",
      null,
      { text: "RapidTO", hyperlink: "https://www.toronto.ca/" },
    ]);
    const rows = await structuredRecords(
      Buffer.from(await book.xlsx.writeBuffer()),
      "xlsx",
    );
    expect(rows[0]["Agenda title"]).toBe("RapidTO");
  });
  it("handles Next.js localhost normalization while refusing foreign origins and hosts", () => {
    expect(
      originError(
        new Request("http://localhost:3000/api/admin/login", {
          headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
        }),
      ),
    ).toBeNull();
    expect(
      originError(
        new Request("http://localhost:3000/api/admin/login", {
          headers: { host: "127.0.0.1:3000", origin: "https://evil.example" },
        }),
      ),
    ).toContain("same-origin");
    expect(
      originError(
        new Request("https://example.com/api/admin/login", {
          headers: { origin: "https://example.com" },
        }),
      ),
    ).toContain("disabled");
  });
});
