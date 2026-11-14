"use client";
import Link from "next/link";
import { Check, ArrowRight, MessageSquare, Circle } from "lucide-react";
import { Localized, LocalizedDate, useLanguage } from "@/lib/i18n/provider";
import { EvidenceButton } from "@/components/evidence/evidence-provider";
import { projectParticipation } from "@/lib/evidence/policy";
import type { CivicProject } from "@/lib/validation/project";
import styles from "./rapidto.module.css";

type Event = CivicProject["events"][number];
const labels: Record<string, string> = {
  "Study direction": "Planning",
  "Public consultation closed": "Public consultation",
  "Council decision": "Council approval",
  "Installation completed": "Installation complete",
  "Priority bus lanes installed": "Bus lanes installed",
  "Monitoring and adjustments": "Monitoring & adjustments",
  "Monitoring dashboard": "Next results",
  "Historical monitoring": "Past results published",
  "Step 1 consultation": "Design options",
  "Step 2 consultation closed": "Public consultation",
  "Design refinement": "Refining the design",
};
/** Only accept an explicitly authored month/season, never invent a day. */
export function periodLabel(description: string) {
  return description.match(
    /^(?:(?:January|February|March|April|May|June|July|August|September|October|November|December|Spring|Summer|Fall|Winter) )?\d{4}(?=\.)/,
  )?.[0];
}
export function stageState(
  project: CivicProject,
  event: Event,
  preview: boolean,
) {
  const evidence = project.evidence.find((e) => e.id === event.evidenceId);
  const verified =
    !project.synthetic &&
    !!evidence?.verifiedAt &&
    ["Officially Confirmed", "Derived from Documented Data"].includes(
      evidence.state,
    );
  const future =
    !!event.date && event.date > new Date().toISOString().slice(0, 10);
  if (!evidence || (!verified && !preview) || future) return "pending";
  if (event.status === "Completed") {
    const confirmed =
      !!event.date ||
      (!!event.completionConfirmedOn &&
        event.completionConfirmedOn <= new Date().toISOString().slice(0, 10) &&
        event.completionConfirmedOn <=
          (evidence.verifiedAt?.slice(0, 10) ?? ""));
    return verified && confirmed ? "done" : preview ? "draftDone" : "pending";
  }
  if (event.status === "Current") return verified ? "current" : "draftCurrent";
  return "pending";
}
export function CorridorProgress({
  project,
  preview = false,
  href,
  variant = "corridor",
}: {
  project: CivicProject;
  preview?: boolean;
  href?: string;
  variant?: "corridor" | "project";
}) {
  const { t } = useLanguage();
  const events = [...project.events].sort(
    (a, b) =>
      (a.position ?? 0) - (b.position ?? 0) || a.date.localeCompare(b.date),
  );
  const routes = [
    ...new Set(
      project.scopes.flatMap((s) =>
        s.id.includes("-ttc-")
          ? [s.label.match(/^TTC (\d+)/)?.[1]].filter((x): x is string => !!x)
          : [],
      ),
    ),
  ].sort((a, b) => Number(a) - Number(b));
  const participation = project.decisions.find((d) =>
    d.id.endsWith("-participation"),
  );
  const next = project.decisions.find((d) => d.id.endsWith("-next"));
  const label = (title: string) =>
    variant === "project" ? title : (labels[title] ?? title);
  const closedEvent = events.find((e) => /consultation closed/i.test(e.title));
  const reportedClosed =
    !!closedEvent && stageState(project, closedEvent, preview) !== "pending";
  const participationState = projectParticipation(project);
  const current = events.find((e) =>
    ["current", "draftCurrent"].includes(stageState(project, e, preview)),
  );
  const web = project.sources.find((s) => s.id === project.id + "-web");
  const nextEvent = events.find((e) => e.status === "Planned");
  const nextText =
    variant === "project"
      ? (next?.explanation ?? "No verified next action recorded.")
      : nextEvent
        ? `${t(labels[nextEvent.title] ?? nextEvent.title)}${periodLabel(nextEvent.description) ? " · " + t(periodLabel(nextEvent.description)!) : ""}`
        : current?.title === "Design refinement"
          ? "Reporting and installation dates have not been announced."
          : current?.title === "Bus lanes in use"
            ? "No new milestone has been confirmed."
            : current
              ? "Watch for monitoring results and further adjustments."
              : "No verified next action recorded.";
  return (
    <Localized>
      <section
        className={styles.progress}
        aria-label={`${project.title} — ${t("Project progress")}`}
      >
        <div className={styles.progressHeading}>
          <div>
            <p className={styles.overline}>
              {variant === "project" ? (
                <>
                  {project.municipality} · {project.category}
                </>
              ) : (
                "Toronto · RapidTO"
              )}
            </p>
            <h2 translate="no">
              {href ? (
                <Link href={href}>
                  {project.title.replace("RapidTO: ", "")}
                </Link>
              ) : (
                project.title.replace("RapidTO: ", "")
              )}
            </h2>
          </div>
          <div className={styles.routeBadges} aria-label="Related TTC routes">
            {routes.map((n) => (
              <a
                key={n}
                href={`https://www.ttc.ca/routes-and-schedules/${n}`}
                target="_blank"
                rel="noreferrer"
                translate="no"
              >
                TTC {n}
              </a>
            ))}
          </div>
        </div>
        <p className={styles.progressRange}>{project.neighbourhood}</p>
        <ol
          className={styles.progressLine}
          style={{
            gridTemplateColumns: `repeat(${Math.max(events.length, 1)},minmax(0,1fr))`,
          }}
        >
          {events.map((event) => {
            const state = stageState(project, event, preview),
              active = state === "current" || state === "draftCurrent";
            return (
              <li
                key={event.id}
                data-state={state}
                aria-current={active ? "step" : undefined}
              >
                <EvidenceButton id={event.evidenceId}>
                  <span key="dot" className={styles.stageDot}>
                    {state === "done" ? (
                      <Check size={17} aria-hidden="true" />
                    ) : (
                      <Circle size={active ? 10 : 7} aria-hidden="true" />
                    )}
                  </span>
                  <span key="name" className={styles.stageName}>
                    {label(event.title)}
                  </span>
                  <span key="date" className={styles.stageDate}>
                    {active ? (
                      preview ? (
                        "Reported current stage"
                      ) : (
                        "You are here"
                      )
                    ) : event.date ? (
                      <LocalizedDate value={event.date} />
                    ) : (
                      (periodLabel(event.description) ?? "Date not confirmed")
                    )}
                  </span>
                  <span key="status" className={styles.srOnly}>
                    {state === "done"
                      ? "Completed"
                      : state === "draftDone"
                        ? "Reported complete — awaiting review"
                        : active
                          ? "Current stage"
                          : "Upcoming or unverified"}
                    . View evidence
                  </span>
                </EvidenceButton>
              </li>
            );
          })}
        </ol>
        <div className={styles.progressActions}>
          <div
            className={styles.participationBox}
            id={href ? undefined : "participation"}
          >
            <MessageSquare size={19} aria-hidden="true" />
            <div>
              <strong>
                {variant === "project"
                  ? "How can I take part?"
                  : participationState === "Open"
                    ? "Comments are open"
                    : reportedClosed || participationState === "Closed"
                      ? "Comment period closed"
                      : "No open comment period confirmed"}
              </strong>
              <p>
                {variant === "project"
                  ? (participation?.explanation ??
                    "Check the official page for participation opportunities.")
                  : reportedClosed
                    ? "You can still check the official page for contacts and updates."
                    : "Check the official page for participation opportunities."}
              </p>
              {participation?.evidenceIds[0] && (
                <EvidenceButton id={participation.evidenceIds[0]}>
                  Participation details
                </EvidenceButton>
              )}
            </div>
          </div>
          <div className={styles.nextBox}>
            <ArrowRight size={19} aria-hidden="true" />
            <div>
              <strong>What happens next?</strong>
              <p>{nextText}</p>
              {next?.evidenceIds[0] && (
                <EvidenceButton id={next.evidenceIds[0]}>
                  Next steps and source
                </EvidenceButton>
              )}
            </div>
          </div>
        </div>
        <footer className={styles.progressFooter}>
          {web?.url && (
            <a href={web.url} target="_blank" rel="noreferrer">
              City project page
            </a>
          )}
          <span>
            Last verified: <LocalizedDate value={project.verifiedAt} />
          </span>
          {preview && <span>Draft stages — awaiting staff review</span>}
        </footer>
        <details className={styles.stageDetails}>
          <summary>Dates, decisions and evidence</summary>
          {events.map((e) => (
            <div key={e.id}>
              <h3>{label(e.title)}</h3>
              <p>{e.description}</p>
              <EvidenceButton id={e.evidenceId} />
            </div>
          ))}
          {next && <p>{next.explanation}</p>}
        </details>
      </section>
    </Localized>
  );
}
