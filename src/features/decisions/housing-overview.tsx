"use client";
import Link from "next/link";
import { Localized, LocalizedDate } from "@/lib/i18n/provider";
import type { CivicProject } from "@/lib/validation/project";
import { EvidenceButton } from "@/components/evidence/evidence-provider";
import { CorridorProgress } from "@/features/rapidto/corridor-progress";
import { ProjectMap } from "@/components/maps/project-map";
import styles from "@/features/rapidto/rapidto.module.css";

/** Housing records use the same reviewed stages and evidence as the staff preview. */
export function HousingOverview({
  project,
  preview = false,
}: {
  project: CivicProject;
  preview?: boolean;
}) {
  const sections = ["proposal", "decision", "scope", "voice"].flatMap(
    (suffix) =>
      project.decisions.filter((decision) =>
        decision.id.endsWith(`-${suffix}`),
      ),
  );
  return (
    <Localized>
      <div className={styles.page}>
        <CorridorProgress
          project={project}
          preview={preview}
          variant="project"
        />
        <div className={styles.answers}>
          {sections.map((decision) => (
            <section className="panel" key={decision.id}>
              <h2>{decision.title}</h2>
              <p>{decision.explanation}</p>
              {decision.conditions && <p>{decision.conditions}</p>}
              {decision.uncertainty && <p>{decision.uncertainty}</p>}
              {decision.evidenceIds.map((id) => (
                <EvidenceButton key={id} id={id} />
              ))}
            </section>
          ))}
        </div>
        {project.scopes.length > 0 && (
          <section className="panel">
            <h2>Project location</h2>
            <ProjectMap
              projects={[project]}
              selectedId={project.id}
              city="Toronto"
              detailed
              preview={preview}
            />
          </section>
        )}
        <section className="panel">
          <h2>Sources &amp; Evidence</h2>
          <ul>
            {project.sources.map((source) => (
              <li key={source.id}>
                <a
                  href={source.url ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  translate="no"
                >
                  {source.title}
                </a>
                {source.date && (
                  <>
                    {" "}
                    · <LocalizedDate value={source.date} />
                  </>
                )}
              </li>
            ))}
          </ul>
          <Link
            href={
              preview
                ? `/studio/${project.id}`
                : `/projects/${project.id}/participation`
            }
          >
            {preview ? "Back to draft editor" : "How to participate"}
          </Link>
        </section>
      </div>
    </Localized>
  );
}
