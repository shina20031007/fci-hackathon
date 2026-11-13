"use client";
import { Localized } from "@/lib/i18n/provider";
import { Discovery } from "@/features/discovery/discovery";
import type { CivicProject } from "@/lib/validation/project";
export function ExploreView({
  projects,
  params,
}: {
  projects: CivicProject[];
  params: { q?: string; next?: string };
}) {
  return (
    <Localized>
      {
        <div className="page">
          <div className="page-heading">
            <p className="eyebrow">01 / MY AREA</p>
            <h1>Find the decisions that matter to you.</h1>
            <p>
              Explore a place, follow a proposal, and see where you can take
              part.
            </p>
          </div>
          <div className="demo-banner">
            <span className="demo-dot" />
            <strong>Independent information. Official sources.</strong>
            <span>
              Real projects are shown first. Fictional cases remain available
              for testing.
            </span>
          </div>
          <Discovery
            projects={projects}
            initialQuery={params.q}
            nextModule={params.next}
          />
        </div>
      }
    </Localized>
  );
}
