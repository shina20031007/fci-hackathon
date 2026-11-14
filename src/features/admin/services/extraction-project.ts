import {
  projectSchema,
  categories,
  documentTypes,
  type CivicProject,
} from "@/lib/validation/project";
import {
  fieldNames,
  type Extraction,
  type PageText,
  checkQuotes,
} from "../types/extraction";
export function extractionProject(
  id: string,
  filename: string,
  url: string | null,
  extraction: Extraction,
  pages: PageText[],
): CivicProject {
  checkQuotes(extraction, pages);
  const get = (name: (typeof fieldNames)[number]) =>
    extraction.fields.find((f) => f.name === name)?.value ?? null;
  const iso = (value: string | null) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  const sourceId = id + "-source",
    decisionId = id + "-decision";
  const evidence = extraction.fields
    .filter((f) => f.value !== null)
    .map((f) => ({
      id: id + "-" + f.name,
      sourceId,
      excerpt: f.quote!,
      section: `Page ${f.page}`,
      state: "Requires Verification" as const,
      verifiedAt: null,
      notes:
        "AI extraction. Exact text matched programmatically; human verification required.",
    }));
  const events = extraction.events.map((e, i) => {
    const evidenceId = id + "-event-" + i;
    evidence.push({
      id: evidenceId,
      sourceId,
      excerpt: e.quote,
      section: `Page ${e.page}`,
      state: "Requires Verification",
      verifiedAt: null,
      notes:
        "AI event suggestion. Verify date, procedural meaning and occurrence.",
    });
    return {
      id: evidenceId + "-stage",
      decisionId,
      title: e.title,
      date: iso(e.date) ?? "",
      type: e.type,
      description: e.description,
      status: "Not verified" as const,
      position: i,
      evidenceId,
    };
  });
  const category = categories.find((c) => c === get("category"));
  return projectSchema.parse({
    id,
    title: (get("title") ?? "Untitled document — review required").slice(
      0,
      160,
    ),
    municipality: get("municipality") ?? "Municipality not confirmed",
    category: category ?? "Public Services",
    neighbourhood: (
      get("location") ??
      get("policyScope") ??
      "Geographic scope not confirmed"
    ).slice(0, 100),
    summary: get("summary") ?? "No supported summary extracted.",
    rationale: get("background") ?? "Policy background not confirmed.",
    authority: get("department") ?? "Responsible department not confirmed",
    status: "Unknown",
    synthetic: false,
    summaryEvidenceId: get("summary") ? id + "-summary" : "",
    revision: 1,
    reviewStatus: "Draft",
    verifiedAt: null,
    updatedAt: new Date().toISOString(),
    sources: [
      {
        id: sourceId,
        title: filename,
        type:
          documentTypes.find((t) => t === get("documentType")) ??
          "Staff report",
        url,
        date: iso(get("publicationDate")),
        synthetic: false,
      },
    ],
    evidence,
    decisions: [
      {
        id: decisionId,
        title: get("title") ?? "Document review",
        explanation:
          get("proposal") ?? get("summary") ?? "Proposal not confirmed.",
        status: "Unknown",
        authority: get("department") ?? "Authority not confirmed",
        conditions: get("conditions") ?? "Conditions not confirmed",
        amendment: get("amendments") ?? "Amendments not confirmed",
        uncertainty: [
          ...extraction.warnings,
          !category ? "Category fallback requires review." : "",
          "All AI fields require human verification.",
        ]
          .filter(Boolean)
          .join(" "),
        date: null,
        reviewState: "Needs Verification",
        notes: "No procedural stage inferred from a report request or vote.",
        evidenceIds: evidence
          .filter((e) => !e.id.includes("-event-"))
          .map((e) => e.id),
      },
      ...(
        [
          ["staffRecommendation", "Staff Recommendation"],
          ["committeeRecommendation", "Committee Recommendation"],
          ["councilDecision", "Council Decision"],
        ] as const
      )
        .filter(([field]) => get(field))
        .map(([field, status]) => ({
          id: id + "-" + field + "-decision",
          title: status,
          explanation: get(field)!,
          status,
          authority: get("department") ?? "Authority not confirmed",
          conditions: get("conditions") ?? "Conditions not confirmed",
          amendment: get("amendments") ?? "Amendments not confirmed",
          uncertainty:
            "AI interpretation requires human verification against the original document.",
          date: null,
          reviewState: "Needs Verification",
          notes: "Preserved separately from other procedural records.",
          evidenceIds: [id + "-" + field],
        })),
    ],
    events,
    versions: [],
    feedback: [],
    opportunities: get("participationMethod")
      ? [
          {
            id: id + "-participation",
            decisionId,
            method: get("participationMethod"),
            description: [
              get("participationMethod"),
              get("participationDeadline")
                ? `Source date: ${get("participationDeadline")}. Deadline timing requires verification.`
                : "No confirmed deadline.",
              get("publicMeeting"),
            ]
              .filter(Boolean)
              .join(" "),
            opensAt: null,
            deadline: null,
            closedOn: null,
            meetingAt: null,
            timeZone: "America/Toronto",
            url,
            verifiedAt: null,
            evidenceId: id + "-participationMethod",
            confirmed: false,
          },
        ]
      : [],
    scopes: [],
  });
}
