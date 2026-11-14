import type { CivicProject } from "@/lib/validation/project";

export const questions = [
  ["proposal", "What's proposed?"],
  ["decision", "What has been decided?"],
  ["scope", "Where is this happening?"],
  ["voice", "What did residents say?"],
] as const;

// This marker is also present in previously saved document drafts.
export function documentDecision(project: CivicProject) {
  return project.decisions.find(
    (d) =>
      d.notes === "No procedural stage inferred from a report request or vote.",
  );
}

export function projectAnswer(
  project: CivicProject,
  kind: (typeof questions)[number][0],
  includeSummary = false,
) {
  const document = documentDecision(project);
  const prefix = document?.id.replace(/-decision$/, "");
  let records = project.decisions.filter((d) => d.id.endsWith(`-${kind}`));
  if (document && kind === "decision") {
    // Recommendations and the legacy proposal record are not adopted decisions.
    records = project.decisions.filter(
      (d) => d.id === `${prefix}-councilDecision-decision`,
    );
  }
  if (document && kind === "proposal" && !records.length) records = [document];
  let paragraphs = records.flatMap((d) => [
    d.explanation,
    d.conditions,
    d.reviewState === "Verified"
      ? d.uncertainty
          .replace(
            "AI interpretation requires human verification against the original document.",
            "",
          )
          .replace("All AI fields require human verification.", "")
          .trim()
      : d.uncertainty,
  ]);
  let evidenceIds = records.flatMap((d) => d.evidenceIds);
  if (document && kind === "proposal" && records[0] === document) {
    evidenceIds = project.evidence
      .filter((e) =>
        ["proposal", "summary", "conditions"].some(
          (f) => e.id === `${prefix}-${f}`,
        ),
      )
      .map((e) => e.id);
  }
  if (kind === "proposal" && (includeSummary || !records.length)) {
    paragraphs.unshift(project.summary);
    evidenceIds.unshift(project.summaryEvidenceId);
  }
  if (!records.length) {
    if (kind === "decision") {
      paragraphs = document
        ? ["No adopted decision is documented in the extracted information."]
        : project.decisions.flatMap((d) => [
            d.explanation,
            d.conditions,
            d.uncertainty,
          ]);
      evidenceIds = document
        ? []
        : project.decisions.flatMap((d) => d.evidenceIds);
    }
    if (kind === "scope") {
      paragraphs = [
        project.neighbourhood,
        ...project.scopes.map((s) => s.description),
      ];
      evidenceIds = [
        ...project.scopes.map((s) => s.evidenceId),
        ...project.evidence
          .filter(
            (e) =>
              document &&
              ["location", "policyScope"].some(
                (f) => e.id === `${prefix}-${f}`,
              ),
          )
          .map((e) => e.id),
      ];
    }
    if (kind === "voice") {
      paragraphs = project.feedback.map((f) => f.summary);
      evidenceIds = project.feedback.flatMap((f) =>
        f.evidenceId ? [f.evidenceId] : [],
      );
    }
  }
  return {
    text: [...new Set(paragraphs.filter(Boolean))],
    ids: [...new Set(evidenceIds.filter(Boolean))],
  };
}
