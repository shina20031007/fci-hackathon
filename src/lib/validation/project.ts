import { z } from "zod";
export const decisionStatuses = [
  "Proposed",
  "Staff Recommendation",
  "Committee Recommendation",
  "Committee Decision",
  "Council Decision",
  "Awaiting Additional Approval",
  "Effective",
  "Deferred",
  "Withdrawn",
  "Unknown",
] as const;
export const categories = [
  "Transportation",
  "Housing",
  "Land Use and Zoning",
  "Infrastructure",
  "Environment",
  "Municipal Budget",
  "Public Services",
] as const;
export const responseTypes = [
  "Accepted",
  "Partially Accepted",
  "Not Accepted",
  "Explanation Provided",
  "Under Review",
  "No Verified Response Found",
] as const;
export const reviewStates = [
  "Draft",
  "Needs Verification",
  "Verified",
  "Rejected",
] as const;
export const evidenceStates = [
  "Officially Confirmed",
  "Derived from Documented Data",
  "Requires Verification",
  "Insufficient Evidence",
] as const;
export const documentTypes = [
  "Staff report",
  "Council minutes",
  "Committee minutes",
  "Public notice",
  "Consultation report",
  "Planning instrument",
  "Geographic dataset",
] as const;
const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
const text = z.string().trim().min(1).max(12000);
const optionalText = z.string().trim().max(12000);
const date = z.iso.date();
const timestamp = z.iso.datetime({ offset: true });
const url = z
  .url()
  .refine((value) => {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password;
  }, "Use a public HTTPS URL without credentials.")
  .nullable();
export const sourceSchema = z.object({
  id,
  title: text,
  type: z.enum(documentTypes),
  url,
  date: date.nullable(),
  synthetic: z.boolean(),
});
export const evidenceSchema = z.object({
  id,
  sourceId: id,
  excerpt: text,
  section: text,
  state: z.enum(evidenceStates),
  verifiedAt: timestamp.nullable(),
  notes: optionalText,
});
export const decisionSchema = z.object({
  id,
  title: text,
  explanation: text,
  status: z.enum(decisionStatuses),
  authority: text,
  conditions: optionalText,
  amendment: optionalText,
  uncertainty: optionalText,
  date: date.nullable(),
  reviewState: z.enum(reviewStates),
  notes: optionalText,
  evidenceIds: z.array(id),
});
export const opportunitySchema = z
  .object({
    id,
    decisionId: id,
    method: text,
    description: text,
    opensAt: timestamp.nullable(),
    deadline: timestamp.nullable(),
    closedOn: date.nullish(),
    meetingAt: timestamp.nullable(),
    timeZone: z.string().refine((v) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }, "Use an IANA time zone."),
    url,
    verifiedAt: timestamp.nullable(),
    evidenceId: id.nullable(),
    confirmed: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (
      value.opensAt &&
      value.deadline &&
      Date.parse(value.deadline) <= Date.parse(value.opensAt)
    )
      ctx.addIssue({
        code: "custom",
        path: ["deadline"],
        message: "Deadline must follow the opening date.",
      });
  });
const position = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);
const ring = z
  .array(position)
  .min(4)
  .refine(
    (v) => v[0][0] === v[v.length - 1][0] && v[0][1] === v[v.length - 1][1],
    "Polygon rings must be closed.",
  );
export const geometrySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("Polygon"), coordinates: z.array(ring).min(1) }),
  z.object({
    type: z.literal("LineString"),
    coordinates: z.array(position).min(2),
  }),
  z.object({ type: z.literal("Point"), coordinates: position }),
]);
export const projectSchema = z
  .object({
    id,
    municipality: text.max(100),
    title: text.max(160),
    category: z.enum(categories),
    neighbourhood: text.max(100),
    summary: text,
    rationale: text,
    authority: text,
    status: z.enum(decisionStatuses),
    synthetic: z.boolean(),
    summaryEvidenceId: z.string().max(100),
    revision: z.number().int().positive(),
    reviewStatus: z.enum(["Draft", "Needs Review", "Verified", "Published"]),
    verifiedAt: timestamp.nullable(),
    updatedAt: timestamp,
    sources: z.array(sourceSchema).max(100),
    evidence: z.array(evidenceSchema).max(300),
    decisions: z.array(decisionSchema).max(100),
    events: z
      .array(
        z.object({
          id,
          decisionId: id,
          title: text,
          date,
          type: text,
          description: text,
          evidenceId: id,
        }),
      )
      .max(200),
    versions: z
      .array(
        z.object({
          id,
          label: text,
          date,
          text,
          changeType: z.enum([
            "Textual edit",
            "Substantive policy change",
            "Initial proposal",
          ]),
          reason: optionalText,
          evidenceId: id,
        }),
      )
      .max(100),
    feedback: z
      .array(
        z.object({
          id,
          decisionId: id,
          topic: text,
          summary: text,
          response: optionalText,
          classification: z.enum(responseTypes),
          amendment: optionalText,
          date,
          evidenceId: id.nullable(),
        }),
      )
      .max(200),
    opportunities: z.array(opportunitySchema).max(100),
    scopes: z
      .array(
        z.object({
          id,
          decisionId: id,
          label: text,
          kind: z.enum([
            "Project boundary",
            "Transportation feature",
            "Municipality boundary",
            "Planning area",
            "Study area",
            "Neighbourhood boundary",
            "Land-use feature",
          ]),
          geometry: geometrySchema,
          description: text,
          evidenceId: id,
        }),
      )
      .max(100),
  })
  .superRefine((p, ctx) => {
    const sources = new Set(p.sources.map((v) => v.id));
    const evidence = new Set(p.evidence.map((v) => v.id));
    const decisions = new Set(p.decisions.map((v) => v.id));
    const issue = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    for (const group of [
      p.sources,
      p.evidence,
      p.decisions,
      p.events,
      p.versions,
      p.feedback,
      p.opportunities,
      p.scopes,
    ])
      if (new Set(group.map((v) => v.id)).size !== group.length)
        issue("Record IDs must be unique.");
    for (const e of p.evidence)
      if (!sources.has(e.sourceId))
        issue(`Evidence ${e.id} has no source document.`);
    for (const d of p.decisions)
      for (const e of d.evidenceIds)
        if (!evidence.has(e))
          issue(`Decision ${d.title} references missing evidence.`);
    for (const item of [
      ...p.events,
      ...p.versions,
      ...p.feedback,
      ...p.opportunities,
      ...p.scopes,
    ])
      if (item.evidenceId && !evidence.has(item.evidenceId))
        issue("A record references missing evidence.");
    for (const item of [
      ...p.events,
      ...p.feedback,
      ...p.opportunities,
      ...p.scopes,
    ])
      if (!decisions.has(item.decisionId))
        issue("A record references a missing decision item.");
    if (p.summaryEvidenceId && !evidence.has(p.summaryEvidenceId))
      issue("Project summary references missing evidence.");
    if (p.synthetic && p.sources.some((s) => !s.synthetic))
      issue("Demonstration projects must use labeled fictional sources.");
    if (!p.synthetic && p.sources.some((s) => s.synthetic))
      issue("Fictional sources cannot support a real municipal project.");
    if (
      p.synthetic &&
      p.evidence.some((e) => e.state === "Officially Confirmed")
    )
      issue("Synthetic evidence cannot be officially confirmed.");
    for (const f of p.feedback)
      if (
        !f.evidenceId &&
        (f.response ||
          f.amendment ||
          f.classification !== "No Verified Response Found")
      )
        issue("Responses and amendment connections require evidence.");
  });
export type CivicProject = z.infer<typeof projectSchema>;
export type Evidence = CivicProject["evidence"][number];
export type Decision = CivicProject["decisions"][number];
export type Opportunity = CivicProject["opportunities"][number];
export type Geometry = z.infer<typeof geometrySchema>;
