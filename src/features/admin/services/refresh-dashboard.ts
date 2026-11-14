import { db } from "@/lib/db/client";
import { getDraft, saveProject } from "@/lib/db/projects";
import { extractionProject } from "./extraction-project";
import { extractionSchema } from "../types/extraction";
import type { CivicProject } from "@/lib/validation/project";

export function mergeDashboardUpgrade(
  project: CivicProject,
  baseline: CivicProject,
  candidate: CivicProject,
) {
  const result = structuredClone(project);
  result.events = result.events.map((event) => {
    const old = baseline.events.find((row) => row.id === event.id);
    const next = candidate.events.find((row) => row.id === event.id);
    // Upgrade only the old importer default; preserve subsequent human edits.
    return old &&
      next &&
      event.status === "Not verified" &&
      Object.keys(old).every(
        (key) =>
          JSON.stringify(old[key as keyof typeof old]) ===
          JSON.stringify(event[key as keyof typeof event]),
      )
      ? { ...event, status: next.status }
      : event;
  });
  for (const decision of candidate.decisions) {
    if (
      !baseline.decisions.some((d) => d.id === decision.id) &&
      !result.decisions.some((d) => d.id === decision.id)
    ) {
      result.decisions.push(decision);
      for (const id of decision.evidenceIds) {
        const evidence = candidate.evidence.find((e) => e.id === id);
        if (evidence && !result.evidence.some((e) => e.id === id))
          result.evidence.push(evidence);
      }
    }
  }
  return result;
}
export async function refreshDocumentDashboard(
  id: string,
  revision: number,
  staff: string,
) {
  const saved = await db.documentImport.findUniqueOrThrow({ where: { id } });
  if (!saved.projectId || !saved.extraction || !saved.originalProject)
    throw new Error("No saved analysis is available for this project.");
  const project = await getDraft(saved.projectId);
  if (!project || project.revision !== revision)
    throw new Error("Draft changed. Reload before updating.");
  if (saved.status !== "Review")
    throw new Error(
      "Finish pending document corrections before updating the dashboard.",
    );
  const candidate = extractionProject(
    project.id + "-ai",
    saved.filename,
    saved.sourceUrl,
    extractionSchema.parse(JSON.parse(saved.extraction)),
    JSON.parse(saved.pages),
  );
  const next = mergeDashboardUpgrade(
    project,
    JSON.parse(saved.originalProject),
    candidate,
  );
  if (JSON.stringify(next) === JSON.stringify(project)) return project;
  return saveProject(next, undefined, staff);
}
