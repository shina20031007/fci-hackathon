"use client";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Localized, LocalizedDate } from "@/lib/i18n/provider";
import {
  EvidenceProvider,
  EvidenceButton,
} from "@/components/evidence/evidence-provider";
import { CorridorProgress, stageState } from "./corridor-progress";
import { Badge } from "@/components/ui/shared";
import { ProjectMap } from "@/components/maps/project-map";
import type { CivicProject } from "@/lib/validation/project";
import { corridors, rapidtoPath } from "./config";
import styles from "./rapidto.module.css";
import { ProjectAnswerCards } from "@/features/decisions/project-answer-cards";

function subscribeSection(callback: () => void) {
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("popstate", callback);
  };
}
const sectionSnapshot = () => window.location.hash;
const serverSectionSnapshot = () => "";

export function RapidTOPage({
  project,
  available = [],
  corridor,
  preview = false,
}: {
  project: CivicProject;
  available?: CivicProject[];
  corridor?: string;
  preview?: boolean;
}) {
  const hash = useSyncExternalStore(
    subscribeSection,
    sectionSnapshot,
    serverSectionSnapshot,
  );
  const activeSection = ["#public-voice", "#participation"].includes(hash)
    ? hash
    : "#timeline";
  const suffix = preview ? "?preview=1" : "";
  const currentStage = project.events.find(
    (event) => stageState(project, event, false) === "current",
  )?.title;
  return (
    <Localized>
      <EvidenceProvider project={project}>
        <div
          className={`page ${styles.page} ${corridor ? styles.corridorPage : ""}`}
        >
          <nav
            aria-label="Breadcrumb"
            className={corridor ? "civic-breadcrumb" : styles.breadcrumb}
          >
            {corridor && (
              <>
                <Link href="/">Home</Link>
                <span aria-hidden="true">/</span>
              </>
            )}
            <Link href="/explore">
              {corridor ? "All projects" : "Explore Decisions"}
            </Link>
            <span aria-hidden="true">/</span>
            {corridor ? (
              <>
                <Link href={rapidtoPath + suffix}>RapidTO Overview</Link>
                <span aria-hidden="true">/</span>
                <span aria-current="page" translate="no">
                  {project.title}
                </span>
              </>
            ) : (
              <span aria-current="page">RapidTO Overview</span>
            )}
          </nav>
          {preview && (
            <aside className="notice">
              <p>
                Unpublished draft preview. Staff verification and publication
                are required before this content appears publicly.
              </p>
              <Link
                href={`/admin?project=${project.id}&section=Review%20%26%20Verification`}
              >
                Review &amp; Verify
              </Link>
            </aside>
          )}
          {corridor ? (
            <header className="project-heading">
              <p className="eyebrow">
                {project.municipality} <span> / </span> {project.category}
              </p>
              <h1 translate="no">{project.title}</h1>
              <div className="tags">
                <Badge tone="blue">{currentStage ?? project.status}</Badge>
                <span className="small muted">
                  Last verified <LocalizedDate value={project.verifiedAt} />
                </span>
              </div>
            </header>
          ) : (
            <header className={styles.header}>
              <p>Toronto · Transportation</p>
              <h1 translate="no">{corridor ? project.title : "RapidTO"}</h1>
              <p className="lead">{project.summary}</p>
              <EvidenceButton id={project.summaryEvidenceId} />
              <p className="small">
                Last verified: <LocalizedDate value={project.verifiedAt} />
                {!project.verifiedAt && " · Awaiting staff verification"}
              </p>
            </header>
          )}
          {corridor && (
            <nav className={styles.anchors} aria-label="Corridor sections">
              {[
                ["#timeline", "Project overview"],
                ["#public-voice", "Public voice"],
                ["#participation", "How to participate"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  aria-current={activeSection === href ? "location" : undefined}
                >
                  {label}
                </a>
              ))}
            </nav>
          )}
          <nav
            id="corridors"
            className={styles.corridors}
            aria-label="Select a Corridor"
          >
            {corridors.map((c) => {
              const record = available.find((p) => p.id === c.id);
              return (
                <Link
                  key={c.slug}
                  href={`${rapidtoPath}/corridors/${c.slug}${suffix}`}
                  aria-current={corridor === c.slug ? "page" : undefined}
                >
                  <strong translate="no">{c.name}</strong>
                  {record && (
                    <span>
                      {record.events.find((e) => e.status === "Current")
                        ?.title ?? "View corridor"}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          {!corridor && (
            <>
              {available.map((p) => (
                <EvidenceProvider key={p.id} project={p}>
                  <CorridorProgress
                    project={p}
                    preview={preview}
                    href={`${rapidtoPath}/corridors/${corridors.find((c) => c.id === p.id)?.slug}${suffix}`}
                  />
                </EvidenceProvider>
              ))}
              <section className="panel">
                <h2>About the plan</h2>
                <p>{project.rationale}</p>
                <p>
                  The plan and individual corridor decisions are shown
                  separately. Select a corridor for its timeline, geography and
                  participation information.
                </p>
                <EvidenceButton id={project.summaryEvidenceId} />
              </section>
              <section id="corridor-map">
                <h2>Map &amp; location</h2>
                {available.length ? (
                  <ProjectMap
                    projects={available}
                    detailed
                    city="Toronto"
                    preview={preview}
                  />
                ) : (
                  <p>
                    <Link href={rapidtoPath + "?preview=1"}>
                      Staff sign-in to preview corridor maps
                    </Link>
                  </p>
                )}
              </section>
              <ProjectAnswerCards project={project} />
            </>
          )}
          {corridor && (
            <>
              <div id="timeline">
                <CorridorProgress project={project} preview={preview} />
              </div>
              <ProjectAnswerCards project={project} includeSummary />
              <section className="panel" id="corridor-map">
                <h2>Project location</h2>
                <p>{project.neighbourhood}</p>
                <p>
                  Reference Corridor: road centreline context, not an exact
                  construction boundary. Distance indicates proximity only.
                </p>
                <ProjectMap
                  projects={[project]}
                  selectedId={project.id}
                  showSelectionSummary={false}
                  detailed
                  city="Toronto"
                  preview={preview}
                />
                {!project.scopes.length && (
                  <p>
                    Toronto overview only. Verified corridor geometry has not
                    yet been added; no project marker is shown.
                  </p>
                )}
              </section>
            </>
          )}
          <details id="sources" className={`panel ${styles.sourcesDisclosure}`}>
            <summary>Sources &amp; Evidence</summary>
            <p>Official documents remain in their original language.</p>
            {project.sources.map((s) => (
              <p key={s.id}>
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    translate="no"
                  >
                    {s.title}
                  </a>
                ) : (
                  s.title
                )}{" "}
                · <LocalizedDate value={s.date} />
              </p>
            ))}
            {project.evidence.map((e) => (
              <p key={e.id}>
                <EvidenceButton id={e.id}>{e.section}</EvidenceButton>
                <span className="small">
                  {" "}
                  · Last verified: <LocalizedDate value={e.verifiedAt} />
                </span>
              </p>
            ))}
          </details>
        </div>
      </EvidenceProvider>
    </Localized>
  );
}
