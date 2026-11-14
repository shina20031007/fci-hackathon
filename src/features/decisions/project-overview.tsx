"use client";
import { Localized } from "@/lib/i18n/provider";
import Link from "next/link";
import {
  ArrowRight,
  GitBranch,
  MessagesSquare,
  Map,
  Navigation,
  Info,
} from "lucide-react";
import type { CivicProject } from "@/lib/validation/project";
import { Badge, SectionTitle } from "@/components/ui/shared";
import { EvidenceButton } from "@/components/evidence/evidence-provider";
import { LocalizedDate } from "@/lib/i18n/provider";
import { participationStatus } from "@/lib/evidence/policy";
import { DecisionTimeline } from "@/components/ui/decision-timeline";
import { PrintButton } from "@/components/ui/print-button";
import { documentDecision } from "./project-answers";
import { HousingOverview } from "./housing-overview";
import { ProjectAnswerCards } from "./project-answer-cards";
import { ProjectMap } from "@/components/maps/project-map";
export function ProjectOverview({
  project,
  preview = false,
}: {
  project: CivicProject;
  preview?: boolean;
}) {
  if (
    documentDecision(project) ||
    (project.category === "Housing" &&
      project.decisions.some((d) => d.id.endsWith("-proposal")))
  ) {
    return <HousingOverview project={project} preview={preview} />;
  }
  if (project.category === "Transportation") {
    return (
      <Localized>
        <>
          <DecisionTimeline project={project} />
          <ProjectAnswerCards project={project} includeSummary />
          {project.scopes.length > 0 && (
            <section className="panel" id="corridor-map">
              <h2>Project location</h2>
              <ProjectMap projects={[project]} detailed preview={preview} />
            </section>
          )}
        </>
      </Localized>
    );
  }
  return (
    <Localized>
      {
        <>
          <DecisionTimeline project={project} />
          <div className="project-overview-grid">
            <section className="panel project-summary">
              <p className="eyebrow">THE PROPOSAL, IN PLAIN LANGUAGE</p>
              <h2>What is being considered?</h2>
              <p className="lead">{project.summary}</p>
              <EvidenceButton id={project.summaryEvidenceId}>
                Source behind this explanation
              </EvidenceButton>
              <div className="summary-divider" />
              <h3>Why this proposal exists</h3>
              <p>{project.rationale}</p>
              <h3>Who is responsible?</h3>
              <p>{project.authority}</p>
            </section>
            <aside className="panel at-a-glance">
              <p className="eyebrow">AT A GLANCE</p>
              <h3>A decision is a process.</h3>
              <dl className="stacked-details">
                <div>
                  <dt>Current stage</dt>
                  <dd>
                    <Badge tone="blue">{project.status}</Badge>
                  </dd>
                </div>
                <div>
                  <dt>Geographic context</dt>
                  <dd>
                    {project.neighbourhood}
                    <br />
                    {project.scopes.length
                      ? project.scopes.map((s) => s.kind).join(", ")
                      : "Geographic relevance unknown"}
                  </dd>
                </div>
                <div>
                  <dt>
                    Last{" "}
                    {project.synthetic
                      ? "demonstration review"
                      : "verification"}
                  </dt>
                  <dd>{<LocalizedDate value={project.verifiedAt} />}</dd>
                </div>
                <div>
                  <dt>Evidence</dt>
                  <dd>
                    {project.sources.length} linked{" "}
                    {project.synthetic ? "fictional " : ""}source documents
                  </dd>
                </div>
              </dl>
              <PrintButton />
            </aside>
          </div>
          <div className="notice">
            <Info size={20} />
            <div>
              <strong>Conditions</strong>
              {project.decisions.map((d) => (
                <p key={d.id}>
                  {d.conditions || "No conditions recorded."} {d.uncertainty}
                </p>
              ))}
            </div>
          </div>
          <SectionTitle title="Project sections" />
          <div className="module-grid">
            {[
              {
                module: "decisions",
                title: "Decision DNA",
                text: "Compare versions, follow the timeline, and inspect conditions.",
                icon: GitBranch,
              },
              {
                module: "public-voice",
                title: "Public Voice",
                text: "Trace concerns to recorded responses and amendments.",
                icon: MessagesSquare,
              },
              {
                module: "impact",
                title: "Impact Explorer",
                text: "Explore recorded geography and the limits of what it tells us.",
                icon: Map,
              },
              {
                module: "participation",
                title: "Action Navigator",
                text: "Check participation dates and prepare your own questions.",
                icon: Navigation,
              },
            ].map(({ module, title, text, icon: Icon }) => (
              <Link
                className="panel module-card"
                key={module}
                href={`/projects/${project.id}/${module}`}
              >
                <Icon size={25} />
                <h3>{title}</h3>
                <p>{text}</p>
                <span>
                  Open workspace <ArrowRight size={15} />
                </span>
              </Link>
            ))}
          </div>
          <section
            className="panel source-library"
            id="project-sources"
            tabIndex={-1}
          >
            <SectionTitle
              title={
                project.synthetic
                  ? "Fictional source library"
                  : "Official document library"
              }
              description={
                project.synthetic
                  ? undefined
                  : "Original documents remain in their published language. Unknown dates and unverified contents are explicitly marked."
              }
            />
            <Link
              className="text-link"
              href={`/projects/${project.id}/decisions#recorded-versions`}
            >
              Compare the recorded versions <ArrowRight size={15} />
            </Link>
            <ul className="prose-list">
              {project.sources.map((source) => (
                <li key={source.id}>
                  <a
                    href={source.url ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    translate="no"
                    lang="en"
                  >
                    {source.title}
                  </a>{" "}
                  · <LocalizedDate value={source.date} />
                  {project.evidence
                    .filter((e) => e.sourceId === source.id)
                    .map((e) => (
                      <EvidenceButton key={e.id} id={e.id} />
                    ))}
                </li>
              ))}
            </ul>
          </section>
          <div className="print-only">
            <h2>Decision brief</h2>
            {project.decisions.map((d) => (
              <section key={d.id}>
                <h3>{d.title}</h3>
                <p>{d.explanation}</p>
                <p>
                  Stage: {d.status}. Conditions: {d.conditions}
                </p>
              </section>
            ))}
            <h2>Participation</h2>
            {project.opportunities.map((o) => (
              <p key={o.id}>
                {o.method}: {o.description} Participation status:{" "}
                {participationStatus(o, project.synthetic)}. Recorded deadline:{" "}
                {o.confirmed ? (
                  <LocalizedDate
                    value={o.deadline}
                    includeTime
                    timeZone={o.timeZone}
                  />
                ) : (
                  "Not verified"
                )}
                . {o.timeZone}
              </p>
            ))}
            <h2>Supporting sources</h2>
            {project.evidence.map((e) => {
              const s = project.sources.find((s) => s.id === e.sourceId);
              return (
                <p key={e.id} translate="no" lang="en">
                  <strong>{s?.title}</strong> · {e.section} ·{" "}
                  {<LocalizedDate value={s?.date ?? null} />}
                  <br />
                  {e.excerpt}
                  <br />
                  {s?.url ?? "Fictional source; no official URL."}
                </p>
              );
            })}
          </div>
        </>
      }
    </Localized>
  );
}
