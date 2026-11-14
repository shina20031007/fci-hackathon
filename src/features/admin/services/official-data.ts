import { db } from "@/lib/db/client";
import { digest } from "./auth";
import { structuredRecords } from "./files";
export const catalogue = "https://ckan0.cf.opendata.inter.prod-toronto.ca";
export const reportUrl =
  catalogue +
  "/dataset/de0bd325-626d-4808-aecf-69e1cdd169fc/resource/792f1378-cdb7-49b6-b540-59c8f4337ac0/download/reportrequestlog2022-2026.xlsx";
export const votingResource = "55ead013-2331-4686-9895-9e8145b94189";
export function agendaNumber(value: string) {
  const match = value.toUpperCase().match(/\b20\d{2}\.[A-Z]{2,3}\d+\.\d+\b/);
  return match?.[0] ?? null;
}
export async function saveOfficialRecords(
  records: Record<string, string>[],
  dataset: "reports" | "votes",
  sourceUrl: string,
) {
  let saved = 0;
  for (const record of records) {
    const agenda = agendaNumber(
      record[dataset === "reports" ? "Item Number" : "Agenda Item #"] ?? "",
    );
    if (!agenda) continue;
    const stable = Object.fromEntries(
      Object.entries(record)
        .filter(([key]) => key !== "_id")
        .sort(([a], [b]) => a.localeCompare(b)),
    );
    const id = digest(dataset + JSON.stringify(stable));
    await db.officialRecord.upsert({
      where: { id },
      create: {
        id,
        dataset,
        agendaItem: agenda,
        sourceUrl,
        record: JSON.stringify(stable),
      },
      update: { sourceUrl, fetchedAt: new Date() },
    });
    saved++;
  }
  return saved;
}
export async function officialFetch(url: string) {
  const parsed = new URL(url);
  if (parsed.origin !== catalogue)
    throw new Error("Unsupported official data host.");
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(`Official data request failed: ${response.status}`);
  if (Number(response.headers.get("content-length")) > 20000000)
    throw new Error("Official resource too large.");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > 20000000) throw new Error("Official resource too large.");
  return buffer;
}
export async function syncOfficial(agenda: string) {
  if (agendaNumber(agenda) !== agenda)
    throw new Error(
      "Use a complete official item number, for example 2024.EX11.1.",
    );
  const reports = (
    await structuredRecords(await officialFetch(reportUrl), "xlsx")
  ).filter((r) => agendaNumber(r["Item Number"] ?? "") === agenda);
  const url =
    catalogue +
    "/api/3/action/datastore_search?" +
    new URLSearchParams({
      resource_id: votingResource,
      filters: JSON.stringify({ "Agenda Item #": agenda }),
      limit: "10000",
    });
  const payload = JSON.parse((await officialFetch(url)).toString());
  if (!payload.success || payload.result.total > 10000)
    throw new Error("Voting data could not be fully retrieved.");
  const votes = payload.result.records as Record<string, string>[];
  return {
    reports: await saveOfficialRecords(reports, "reports", reportUrl),
    votes: await saveOfficialRecords(votes, "votes", url),
  };
}

/** Create a review draft from exact official records; this never invokes AI. */
export async function createOfficialDraft(
  agenda: string,
  category: string,
  staff: string,
) {
  const { categories, projectSchema } =
    await import("@/lib/validation/project");
  const { createProject } = await import("@/lib/db/projects");
  if (
    agendaNumber(agenda) !== agenda ||
    !categories.includes(category as (typeof categories)[number])
  )
    throw new Error("Select an exact agenda item and a valid category.");
  const existing = await db.project.findFirst({
    where: { agendaItem: agenda },
  });
  if (existing) return existing.id;
  const records = await db.officialRecord.findMany({
    where: { agendaItem: agenda, dataset: "reports" },
    orderBy: { id: "asc" },
  });
  if (!records.length)
    throw new Error(
      "Import a matching report request record before creating a draft.",
    );
  const row = JSON.parse(records[0].record) as Record<string, string>;
  const id = "toronto-" + agenda.toLowerCase().replaceAll(".", "-");
  const title = row["Agenda title"].replace(/^[A-Z]{2,3}\d+\.\d+\s*-\s*/, "");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(row["Meeting Date"])
    ? row["Meeting Date"]
    : null;
  const sourceId = id + "-log",
    evidenceId = id + "-request",
    decisionId = id + "-decision";
  const excerpt = row.Directive || row["Agenda title"];
  const project = projectSchema.parse({
    id,
    title,
    municipality: "Toronto",
    category,
    neighbourhood: "Geographic scope not verified",
    summary: `${title}. The official log records a request for a report. The underlying proposal, final decision and implementation require separate verification.`,
    rationale:
      "Review the linked agenda, staff report and council decision before publication.",
    authority: row["Assigned to"] || "Responsible department not confirmed",
    status: "Unknown",
    synthetic: false,
    summaryEvidenceId: evidenceId,
    revision: 1,
    reviewStatus: "Draft",
    verifiedAt: null,
    updatedAt: new Date().toISOString(),
    sources: [
      {
        id: sourceId,
        title: "Toronto Report Request Log (2022–2026)",
        type: "Official dataset",
        url: records[0].sourceUrl,
        date: null,
        synthetic: false,
      },
      {
        id: id + "-agenda",
        title: `Official agenda item ${agenda}`,
        type: "Council minutes",
        url: `https://secure.toronto.ca/council/agenda-item.do?item=${agenda}`,
        date,
        synthetic: false,
      },
    ],
    evidence: [
      {
        id: evidenceId,
        sourceId,
        excerpt,
        section: `Item Number ${agenda}; Directive`,
        state: "Requires Verification",
        verifiedAt: null,
        notes: `Report request status: ${row.Status}. Report status is not a project decision or implementation status.`,
      },
    ],
    decisions: [
      {
        id: decisionId,
        title: "Report request",
        explanation: excerpt,
        status: "Unknown",
        authority: row["Req. Body"] || "Authority not confirmed",
        conditions: "Not verified",
        amendment: "Not verified",
        uncertainty:
          "This is a report request, not proof of final project approval or implementation.",
        date,
        reviewState: "Needs Verification",
        notes: "Imported by ordinary structured-data parsing, without AI.",
        evidenceIds: [evidenceId],
      },
    ],
    events: [
      {
        id: id + "-request-event",
        decisionId,
        title: "Report request record",
        date: date ?? "",
        type: "Report Request Status",
        description: excerpt,
        status: "Not verified",
        position: 0,
        evidenceId,
      },
    ],
    versions: [],
    feedback: [],
    opportunities: [],
    scopes: [],
  });
  await createProject(project);
  await db.project.update({
    where: { id },
    data: { agendaItem: agenda, reviewRequired: true },
  });
  await db.reviewRecord.create({
    data: {
      projectId: id,
      revision: 1,
      action: "Official records imported",
      note: `Created by ${staff}. ${records.length} report request records available; evidence and matching require review.`,
    },
  });
  return id;
}
