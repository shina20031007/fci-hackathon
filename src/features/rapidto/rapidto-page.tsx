"use client";
import Link from "next/link";
import { Localized, LocalizedDate } from "@/lib/i18n/provider";
import {
  EvidenceProvider,
  EvidenceButton,
} from "@/components/evidence/evidence-provider";
import { CorridorProgress } from "./corridor-progress";
import { ProjectMap } from "@/components/maps/project-map";
import type { CivicProject } from "@/lib/validation/project";
import { corridors, rapidtoPath } from "./config";
import styles from "./rapidto.module.css";
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
  const suffix = preview ? "?preview=1" : "";
  const order = [
    "proposal",
    "scope",
    "participation",
    "decision",
    "changes",
    "voice",
    "response",
    "next",
  ];
  const sections = [...project.decisions].sort((a, b) => {
    const rank = (id: string) => {
      const i = order.findIndex((k) => id.endsWith("-" + k));
      return i < 0 ? 99 : i;
    };
    return rank(a.id) - rank(b.id);
  });
  return (
    <Localized>
      <EvidenceProvider project={project}>
        <div className={`page ${styles.page}`}>
          <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
            <Link href="/explore">Explore Decisions</Link>
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
              <section className="panel">
                <h2>Plan decisions</h2>
                {sections.map((d) => (
                  <article key={d.id}>
                    <h3>{d.title}</h3>
                    <p>{d.explanation}</p>
                    {d.conditions && <p>{d.conditions}</p>}
                    {d.uncertainty && <p>{d.uncertainty}</p>}
                    {d.evidenceIds.map((id) => (
                      <EvidenceButton key={id} id={id} />
                    ))}
                  </article>
                ))}
              </section>
            </>
          )}
          {corridor && (
            <>
              <div id="timeline">
                <CorridorProgress project={project} preview={preview} />
              </div>
              <details className={styles.moreDetails}>
                <summary>Project details</summary>
                <div className={styles.answers}>
                  {sections.slice(0, 4).map((d) => (
                    <section className="panel" key={d.id}>
                      <h2>{d.title}</h2>
                      <p>{d.explanation}</p>
                      {d.conditions && <p>{d.conditions}</p>}
                      {d.uncertainty && <p>{d.uncertainty}</p>}
                      {d.evidenceIds.map((id) => (
                        <EvidenceButton key={id} id={id} />
                      ))}
                    </section>
                  ))}
                </div>
              </details>
              <nav className={styles.anchors} aria-label="Corridor sections">
                <a href="#corridor-map">Map &amp; location</a>
                <a href="#timeline">Decision Timeline</a>
                <a href="#changes">What Changed?</a>
                <a href="#public-voice">Public Voice</a>
                <a href="#sources">Sources &amp; Evidence</a>
              </nav>
              <section id="corridor-map">
                <h2>Does It Affect Me?</h2>
                <p>{project.neighbourhood}</p>
                <p>
                  Reference Corridor: road centreline context, not an exact
                  construction boundary. Distance indicates proximity only.
                </p>
                <ProjectMap
                  projects={[project]}
                  selectedId={project.id}
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
              <section id="changes" className={styles.moreDetails}>
                <h2>What Changed?</h2>
                <div className={styles.details}>
                  {sections
                    .filter(
                      (d) =>
                        d.id.endsWith("-changes") || d.id.endsWith("-next"),
                    )
                    .map((d) => (
                      <section className="panel" key={d.id}>
                        <h2>{d.title}</h2>
                        <p>{d.explanation}</p>
                        {d.conditions && <p>{d.conditions}</p>}
                        {d.uncertainty && <p>{d.uncertainty}</p>}
                        {d.evidenceIds.map((id) => (
                          <EvidenceButton key={id} id={id} />
                        ))}
                      </section>
                    ))}
                </div>
              </section>
              <section id="public-voice" className={styles.moreDetails}>
                <h2>Public Voice</h2>
                {sections.some(
                  (d) => d.id.endsWith("-voice") || d.id.endsWith("-response"),
                ) ? (
                  <div className={styles.details}>
                    {sections
                      .filter(
                        (d) =>
                          d.id.endsWith("-voice") || d.id.endsWith("-response"),
                      )
                      .map((d) => (
                        <section className="panel" key={d.id}>
                          <h3>{d.title}</h3>
                          <p>{d.explanation}</p>
                          {d.conditions && <p>{d.conditions}</p>}
                          {d.uncertainty && <p>{d.uncertainty}</p>}
                          {d.evidenceIds.map((id) => (
                            <EvidenceButton key={id} id={id} />
                          ))}
                        </section>
                      ))}
                  </div>
                ) : (
                  <p>
                    No reviewed summary of residents’ comments is available
                    here.
                  </p>
                )}
              </section>
            </>
          )}
          <details id="sources" className="panel">
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
