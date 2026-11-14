import type { CivicProject } from "@/lib/validation/project";
/** A changed statement must be saved before a separate review can approve it. */
export function invalidateChangedReviews(
  previous: CivicProject,
  next: CivicProject,
): CivicProject {
  const changedSources = new Set(
    next.sources
      .filter((source) => {
        const old = previous.sources.find((s) => s.id === source.id);
        return !old || JSON.stringify(old) !== JSON.stringify(source);
      })
      .map((source) => source.id),
  );
  const changedEvidence = new Set(
    next.evidence
      .filter((evidence) => {
        const old = previous.evidence.find((e) => e.id === evidence.id);
        return (
          changedSources.has(evidence.sourceId) ||
          !old ||
          old.excerpt !== evidence.excerpt ||
          old.section !== evidence.section ||
          old.sourceId !== evidence.sourceId ||
          old.state !== evidence.state
        );
      })
      .map((evidence) => evidence.id),
  );
  return {
    ...next,
    evidence: next.evidence.map((e) =>
      changedEvidence.has(e.id) ? { ...e, verifiedAt: null } : e,
    ),
    events: next.events.map((event) => {
      const old = previous.events.find((e) => e.id === event.id);
      const content = (e: typeof event) =>
        JSON.stringify({
          title: e.title,
          date: e.date,
          status: e.status,
          description: e.description,
          evidenceId: e.evidenceId,
        });
      return !old ||
        content(old) !== content(event) ||
        changedEvidence.has(event.evidenceId)
        ? { ...event, completionConfirmedOn: null }
        : event;
    }),
    decisions: next.decisions.map((decision) => {
      const old = previous.decisions.find((d) => d.id === decision.id);
      const content = (d: typeof decision) =>
        JSON.stringify({
          title: d.title,
          explanation: d.explanation,
          status: d.status,
          authority: d.authority,
          conditions: d.conditions,
          amendment: d.amendment,
          uncertainty: d.uncertainty,
          date: d.date,
          evidenceIds: [...d.evidenceIds].sort(),
        });
      const changed =
        !old ||
        content(old) !== content(decision) ||
        decision.evidenceIds.some((id) => changedEvidence.has(id));
      return changed
        ? { ...decision, reviewState: "Needs Verification" }
        : decision;
    }),
    opportunities: next.opportunities.map((opportunity) => {
      const old = previous.opportunities.find((o) => o.id === opportunity.id);
      const content = (o: typeof opportunity) =>
        JSON.stringify({
          method: o.method,
          description: o.description,
          opensAt: o.opensAt,
          deadline: o.deadline,
          closedOn: o.closedOn ?? null,
          meetingAt: o.meetingAt,
          timeZone: o.timeZone,
          url: o.url,
          evidenceId: o.evidenceId,
          decisionId: o.decisionId,
        });
      const changed =
        !old ||
        content(old) !== content(opportunity) ||
        (opportunity.evidenceId && changedEvidence.has(opportunity.evidenceId));
      return changed
        ? { ...opportunity, confirmed: false, verifiedAt: null }
        : opportunity;
    }),
  };
}
