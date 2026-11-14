"use client";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { Localized, LocalizedDate } from "@/lib/i18n/provider";
import type { CivicProject } from "@/lib/validation/project";
import { EvidenceButton } from "@/components/evidence/evidence-provider";
import {
  participationStatus,
  projectParticipation,
} from "@/lib/evidence/policy";
export function DecisionTimeline({
  project,
  allowUndatedCompleted = false,
}: {
  project: CivicProject;
  allowUndatedCompleted?: boolean;
}) {
  const verified = (id: string) => {
    const e = project.evidence.find((e) => e.id === id);
    return (
      !project.synthetic &&
      !!e?.verifiedAt &&
      ["Officially Confirmed", "Derived from Documented Data"].includes(e.state)
    );
  };
  const events = [...project.events].sort(
    (a, b) =>
      (a.position ?? 0) - (b.position ?? 0) || a.date.localeCompare(b.date),
  );
  const state = (e: (typeof events)[number]) =>
    verified(e.evidenceId) &&
    e.status === "Completed" &&
    ((!e.date && allowUndatedCompleted) ||
      (!!e.date && new Date(e.date + "T23:59:59Z") < new Date()))
      ? "Verified Completed"
      : verified(e.evidenceId) && e.status === "Current"
        ? "Verified Current"
        : "Upcoming / Unverified";
  const next = events.find(
    (e) =>
      verified(e.evidenceId) &&
      e.status === "Planned" &&
      (!e.date || e.date >= new Date().toISOString().slice(0, 10)),
  );
  const participation = projectParticipation(project);
  return (
    <Localized>
      <section
        className="panel decision-timeline"
        aria-label="Decision Timeline"
      >
        <h2>Decision Timeline</h2>
        {events.length ? (
          <ol className="decision-stages">
            {events.map((event) => (
              <li
                key={event.id}
                className={
                  state(event) === "Verified Completed"
                    ? "stage-complete"
                    : state(event) === "Verified Current"
                      ? "stage-current"
                      : "stage-pending"
                }
                aria-current={
                  state(event) === "Verified Current" ? "step" : undefined
                }
              >
                {state(event) === "Verified Completed" ? (
                  <CheckCircle2 aria-hidden="true" />
                ) : state(event) === "Verified Current" ? (
                  <Circle aria-hidden="true" />
                ) : (
                  <Clock aria-hidden="true" />
                )}
                <h3>{event.title}</h3>
                <strong>{state(event)}</strong>
                <p>
                  {event.date ? (
                    <LocalizedDate value={event.date} />
                  ) : (
                    "Date not confirmed"
                  )}
                </p>
                <p>{event.description}</p>
                <EvidenceButton id={event.evidenceId}>
                  View evidence
                </EvidenceButton>
              </li>
            ))}
          </ol>
        ) : (
          <p>No supported timeline events recorded.</p>
        )}
        <div className="timeline-context">
          <section>
            <h3>Participation Status</h3>
            <strong>
              {participation === "Open"
                ? "Open"
                : participation === "Closed"
                  ? "Closed"
                  : "Not verified"}
            </strong>
            {project.opportunities
              .filter((o) =>
                ["Open", "Closed"].includes(
                  participationStatus(o, project.synthetic),
                ),
              )
              .map((o) => (
                <p key={o.id}>
                  {o.method}
                  {o.url && (
                    <>
                      {" "}
                      ·{" "}
                      <a href={o.url} target="_blank" rel="noreferrer">
                        Official participation instructions
                      </a>
                    </>
                  )}
                  {(o.deadline || o.closedOn) && (
                    <>
                      {" "}
                      ·{" "}
                      <LocalizedDate
                        value={o.deadline ?? o.closedOn ?? null}
                        includeTime={!!o.deadline}
                        timeZone={o.timeZone}
                      />
                    </>
                  )}
                </p>
              ))}
          </section>
          <section>
            <h3>What&apos;s Next?</h3>
            <p>
              {next ? next.description : "No verified next action recorded."}
            </p>
            {next && (
              <EvidenceButton id={next.evidenceId}>
                View evidence
              </EvidenceButton>
            )}
          </section>
        </div>
        <details>
          <summary>Official sources and review dates</summary>
          {project.sources.map((source) => (
            <p key={source.id}>
              <span translate="no">{source.title}</span> ·{" "}
              <LocalizedDate value={source.date} />
              {source.url && (
                <>
                  {" "}
                  ·{" "}
                  <a href={source.url} target="_blank" rel="noreferrer">
                    Open official source
                  </a>
                </>
              )}
            </p>
          ))}
          <p>
            Last verified: <LocalizedDate value={project.verifiedAt} />
          </p>
        </details>
      </section>
    </Localized>
  );
}
