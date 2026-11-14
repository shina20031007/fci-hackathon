import { createHash } from "node:crypto";
import type { CivicProject } from "@/lib/validation/project";
export const reviewFields = [
  "title",
  "municipality",
  "category",
  "authority",
  "neighbourhood",
  "summary",
  "rationale",
  "status",
  "decisions",
  "events",
  "sources",
  "evidence",
  "opportunities",
  "scopes",
] as const;
export function fieldHash(
  project: CivicProject,
  field: (typeof reviewFields)[number],
) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        value: project[field],
        sources: project.sources,
        evidence: project.evidence,
      }),
    )
    .digest("hex");
}
