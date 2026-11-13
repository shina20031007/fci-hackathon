import type { CivicProject, Opportunity } from "@/lib/validation/project";
export function participationStatus(
  window: Opportunity,
  synthetic: boolean,
  now = new Date(),
): string {
  if (
    !window.confirmed ||
    !window.evidenceId ||
    !window.verifiedAt ||
    (!synthetic && !window.url)
  )
    return "Verification Required";
  const localParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: window.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const localDay = ["year", "month", "day"]
    .map((type) => localParts.find((part) => part.type === type)?.value)
    .join("-");
  if (window.closedOn && window.closedOn < localDay) return "Closed";
  if (!window.deadline) return "No Verified Opportunity";
  if (Date.parse(window.deadline) < now.getTime()) return "Closed";
  if (!window.opensAt) return "Verification Required";
  return Date.parse(window.opensAt) > now.getTime() ? "Upcoming" : "Open";
}
export function projectParticipation(
  project: CivicProject,
  now = new Date(),
): string {
  const statuses = project.opportunities.map((o) =>
    participationStatus(o, project.synthetic, now),
  );
  return (
    ["Open", "Upcoming", "Verification Required", "Closed"].find((s) =>
      statuses.includes(s),
    ) ?? "No Verified Opportunity"
  );
}
export function publicationIssues(p: CivicProject): string[] {
  const issues: string[] = [];
  const evidence = new Map(p.evidence.map((e) => [e.id, e]));
  const usable = (id: string) => {
    const e = evidence.get(id);
    const source = p.sources.find((s) => s.id === e?.sourceId);
    return (
      !!e &&
      !!e.verifiedAt &&
      !!source &&
      (p.synthetic
        ? source.synthetic && e.state === "Requires Verification"
        : !source.synthetic &&
          !!source.url &&
          ["Officially Confirmed", "Derived from Documented Data"].includes(
            e.state,
          ))
    );
  };
  if (!p.decisions.length) issues.push("Add at least one decision item.");
  if (!usable(p.summaryEvidenceId))
    issues.push(
      "Review supporting evidence for the project summary and rationale.",
    );
  for (const d of p.decisions) {
    if (d.reviewState !== "Verified")
      issues.push(`Review the claim: ${d.title}.`);
    if (!d.evidenceIds.length || !d.evidenceIds.every(usable))
      issues.push(`Review source evidence for: ${d.title}.`);
  }
  for (const r of [...p.events, ...p.versions, ...p.scopes, ...p.feedback])
    if (r.evidenceId && !usable(r.evidenceId))
      issues.push(
        "Review evidence supporting timeline, versions, maps, and feedback.",
      );
  if (!p.synthetic && p.feedback.some((f) => !f.evidenceId))
    issues.push("Add source evidence for every recorded public concern.");
  for (const o of p.opportunities)
    if (
      o.confirmed &&
      (!o.evidenceId ||
        !usable(o.evidenceId) ||
        !o.verifiedAt ||
        (!p.synthetic && !o.url))
    )
      issues.push(`Confirm the source and instructions for ${o.method}.`);
  return [...new Set(issues)];
}
export function orderedEvents(project: CivicProject) {
  return [...project.events].sort((a, b) => a.date.localeCompare(b.date));
}
export function filterProjects(
  projects: CivicProject[],
  filters: {
    query?: string;
    municipality?: string;
    category?: string;
    status?: string;
    participation?: string;
    recent?: boolean;
  },
  now = new Date(),
) {
  return projects.filter(
    (p) =>
      (!filters.query ||
        [p.title, p.municipality, p.neighbourhood, p.category, p.summary]
          .join(" ")
          .toLowerCase()
          .includes(filters.query.trim().toLowerCase())) &&
      (!filters.municipality || p.municipality === filters.municipality) &&
      (!filters.category || p.category === filters.category) &&
      (!filters.status || p.status === filters.status) &&
      (!filters.participation ||
        projectParticipation(p, now) === filters.participation) &&
      (!filters.recent ||
        now.getTime() - Date.parse(p.updatedAt) <= 30 * 86400000),
  );
}
export function filterFeedback(
  project: CivicProject,
  topic: string,
  response: string,
  decision: string,
) {
  return project.feedback.filter(
    (f) =>
      (!topic || f.topic === topic) &&
      (!response || f.classification === response) &&
      (!decision || f.decisionId === decision),
  );
}
