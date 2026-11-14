import { z } from "zod";
export const fieldNames = [
  "title",
  "municipality",
  "department",
  "agendaItem",
  "category",
  "secondaryCategory",
  "documentType",
  "publicationDate",
  "summary",
  "background",
  "proposal",
  "staffRecommendation",
  "committeeRecommendation",
  "councilDecision",
  "amendments",
  "conditions",
  "location",
  "policyScope",
  "participationMethod",
  "participationDeadline",
  "residentComments",
  "publicMeeting",
] as const;
export const extractionSchema = z.object({
  fields: z.array(
    z.object({
      name: z.enum(fieldNames),
      value: z.string().nullable(),
      page: z.number().int().positive().nullable(),
      quote: z.string().nullable(),
    }),
  ),
  events: z.array(
    z.object({
      title: z.string(),
      date: z.string().nullable(),
      description: z.string(),
      status: z.enum(["Completed", "Current", "Planned", "Not verified"]),
      type: z.enum([
        "Staff Recommendation",
        "Committee Recommendation",
        "Council Decision",
        "Amendment",
        "Report Request Status",
        "Implementation",
        "Public meeting",
        "Consultation",
        "Next action",
      ]),
      page: z.number().int().positive(),
      quote: z.string(),
    }),
  ),
  // Optional for older saved responses; required for new model requests.
  locations: z
    .array(
      z.object({
        label: z.string(),
        kind: z.enum(["site", "corridor", "area", "citywide"]),
        page: z.number().int().positive(),
        quote: z.string(),
      }),
    )
    .optional(),
  warnings: z.array(z.string()),
});
export type Extraction = z.infer<typeof extractionSchema>;
export type PageText = { page: number; text: string };
/** Normalize typography only; preserve words, punctuation, numbers and negation. */
export function normalizeCitation(text: string) {
  return text
    .normalize("NFKC")
    .replace(/\u00ad/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
export function matchCitation(
  quote: string | null,
  page: number | null,
  pages: PageText[],
) {
  if (!quote || normalizeCitation(quote).length < 8)
    return { page: null, kind: "Unmatched" };
  const matches = pages.filter((p) =>
    normalizeCitation(p.text).includes(normalizeCitation(quote)),
  );
  const declared = matches.find((p) => p.page === page);
  if (declared)
    return {
      page: declared.page,
      kind: declared.text.includes(quote)
        ? "Exact passage"
        : "Typography / whitespace match",
    };
  if (matches.length === 1)
    return { page: matches[0].page, kind: "Different PDF page" };
  return { page: null, kind: matches.length ? "Ambiguous page" : "Unmatched" };
}
export function checkQuotes(extraction: Extraction, pages: PageText[]) {
  const rows = [
    ...extraction.fields.filter((f) => f.value !== null),
    ...extraction.events,
    ...(extraction.locations ?? []),
  ];
  for (const row of rows) {
    const match = matchCitation(row.quote, row.page, pages);
    if (match.page === null || match.page !== row.page)
      throw new Error(
        "An extracted citation does not match its source page. Review the extraction manually.",
      );
  }
  const names = extraction.fields.map((f) => f.name);
  // Older saved analyses predate the resident-comments field.
  if (
    fieldNames.some(
      (name) => name !== "residentComments" && !names.includes(name),
    )
  )
    throw new Error("Missing extraction fields. Review the analysis manually.");
  if (new Set(names).size !== names.length)
    throw new Error("Duplicate extraction fields.");
}

/** Retain only page-grounded suggestions; raw output is retained separately for review. */
export function groundExtraction(
  extraction: Extraction,
  pages: PageText[],
): Extraction {
  const result = structuredClone(extraction);
  function locate(quote: string | null, page: number | null, label: string) {
    const match = matchCitation(quote, page, pages);
    if (match.page !== null && match.page !== page)
      result.warnings.push(
        `${label}: page reference corrected by exact source-text matching; verify the interpretation.`,
      );
    return match.page;
  }
  for (const field of result.fields)
    if (field.value !== null) {
      const page = locate(field.quote, field.page, field.name);
      if (page === null) {
        result.warnings.push(
          `${field.name}: suggestion withheld because its quotation could not be matched. See saved raw output for manual review.`,
        );
        field.value = null;
        field.quote = null;
        field.page = null;
      } else field.page = page;
    }
  result.events = result.events.filter((event) => {
    const page = locate(event.quote, event.page, event.title);
    if (page === null) {
      result.warnings.push(
        `Timeline event withheld: ${event.title}. Its quotation could not be matched.`,
      );
      return false;
    }
    event.page = page;
    return true;
  });
  if (result.locations) {
    result.locations = result.locations.filter((location) => {
      const page = locate(location.quote, location.page, location.label);
      if (page === null) {
        result.warnings.push(
          `Location withheld: ${location.label}. Its quotation could not be matched.`,
        );
        return false;
      }
      location.page = page;
      return true;
    });
  }
  checkQuotes(result, pages);
  return result;
}
