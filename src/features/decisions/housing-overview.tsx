"use client";
import Link from "next/link";
import { DocumentMap } from "@/components/maps/document-map";
import { documentDecision } from "./project-answers";
import { Localized, LocalizedDate } from "@/lib/i18n/provider";
import type { CivicProject } from "@/lib/validation/project";
import { ProjectAnswerCards } from "./project-answer-cards";
import { CorridorProgress } from "@/features/rapidto/corridor-progress";
import { ProjectMap } from "@/components/maps/project-map";
import styles from "@/features/rapidto/rapidto.module.css";

/** Shared document dashboard for housing and staff previews across categories. */
export function HousingOverview({
  project,
  preview = false,
}: {
  project: CivicProject;
  preview?: boolean;
}) {
  return (
    <Localized>
      <div className={styles.page}>
        <CorridorProgress
          project={project}
          preview={preview}
          variant="project"
        />
        <ProjectAnswerCards project={project} />
        {documentDecision(project) ? (
          <DocumentMap project={project} preview={preview} />
        ) : (
          project.scopes.length > 0 && (
            <section className="panel">
              <h2>Project location</h2>
              <ProjectMap
                projects={[project]}
                selectedId={project.id}
                detailed
                preview={preview}
              />
            </section>
          )
        )}
        <details className={`panel ${styles.sourcesDisclosure}`}>
          <summary>Sources &amp; Evidence</summary>
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
        </details>
      </div>
    </Localized>
  );
}
