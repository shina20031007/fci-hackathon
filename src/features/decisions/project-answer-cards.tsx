"use client";
import { projectAnswer, questions } from "./project-answers";
import type { CivicProject } from "@/lib/validation/project";
import { EvidenceButton } from "@/components/evidence/evidence-provider";
import { Localized } from "@/lib/i18n/provider";
import styles from "@/features/rapidto/rapidto.module.css";

/** A shared four-question overview; all other records stay in the project data. */
export function ProjectAnswerCards({
  project,
  includeSummary = false,
}: {
  project: CivicProject;
  includeSummary?: boolean;
}) {
  return (
    <Localized>
      <div className={styles.answers} data-project-answers>
        {questions.map(([kind, title]) => {
          const { text, ids } = projectAnswer(project, kind, includeSummary);
          return (
            <section
              className={`panel ${styles.answerCard}`}
              key={kind}
              id={kind === "voice" ? "public-voice" : undefined}
            >
              <h2>{title}</h2>
              <div className={styles.answerBody}>
                {text.length ? (
                  text.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
                ) : (
                  <p>
                    {kind === "voice"
                      ? "No reviewed summary of residents’ comments is available here."
                      : "No verified information recorded."}
                  </p>
                )}
              </div>
              {ids.length > 0 && (
                <div className={styles.answerEvidence}>
                  <EvidenceButton id={ids} />
                </div>
              )}
            </section>
          );
        })}
      </div>
    </Localized>
  );
}
