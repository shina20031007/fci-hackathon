"use client";
import { Localized } from "@/lib/i18n/provider";
import { ProjectFrame } from "@/components/layout/project-frame";
import { DecisionDNA } from "@/features/decisions/decision-dna";
import { PublicVoice } from "@/features/public-voice/public-voice";
import { Participation } from "@/features/participation/participation";
import { ProjectMap } from "@/components/maps/project-map";
import { SectionTitle } from "@/components/ui/shared";
import type { CivicProject } from "@/lib/validation/project";
export function ModuleView({
  project,
  module,
  decision,
}: {
  project: CivicProject;
  module: string;
  decision?: string;
}) {
  return (
    <Localized>
      {
        <ProjectFrame project={project} active={module}>
          {module === "decisions" ? (
            <DecisionDNA project={project} />
          ) : module === "public-voice" ? (
            <PublicVoice project={project} initialDecision={decision} />
          ) : module === "participation" ? (
            <Participation project={project} />
          ) : (
            <>
              <SectionTitle
                eyebrow="04 / IMPACT EXPLORER"
                title="A place in the decision. Not an assumed impact."
                description="Explore recorded boundaries, select a location, and inspect the underlying evidence."
              />
              <div className="impact-layout">
                <section className="panel">
                  <ProjectMap projects={[project]} detailed />
                </section>
                <aside className="impact-notes">
                  <div className="panel">
                    <p className="eyebrow">READING THE MAP</p>
                    <h3>Relevance has limits.</h3>
                    <dl className="stacked-details">
                      <div>
                        <dt>Documented geographic context</dt>
                        <dd>
                          {project.neighbourhood}.{" "}
                          {project.scopes.length
                            ? "The source-linked geometry below defines the recorded area."
                            : "No supported geometry is available."}
                        </dd>
                      </div>
                      <div>
                        <dt>Derived relationship</dt>
                        <dd>
                          Point-in-polygon and distance calculations determine
                          whether a selected point is inside or within 500
                          metres of a feature.
                        </dd>
                      </div>
                      <div>
                        <dt>Unverified impacts</dt>
                        <dd>
                          Property values, traffic, rents, environmental
                          outcomes, and construction dates are not established.
                        </dd>
                      </div>
                      <div>
                        <dt>Before / after comparison</dt>
                        <dd>
                          Unavailable. Two verified geographic versions have not
                          been provided.
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div className="notice">
                    Address queries go to the selected search provider. Selected
                    locations are not saved. Map information is also available
                    as text.
                  </div>
                </aside>
              </div>
            </>
          )}
        </ProjectFrame>
      }
    </Localized>
  );
}
