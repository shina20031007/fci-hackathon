"use client";
import { Localized } from "@/lib/i18n/provider";
import { Discovery } from "@/features/discovery/discovery";
import { categories, type CivicProject } from "@/lib/validation/project";
export function ExploreView({
  projects,
  params,
}: {
  projects: CivicProject[];
  params: { q?: string; next?: string; category?: string };
}) {
  const category = categories.find((value) => value === params.category) ?? "";
  return (
    <Localized>
      {
        <div className="page">
          <div className="page-heading">
            <h1>Find the decisions that matter to you.</h1>
            <p>
              Explore a place, follow a proposal, and see where you can take
              part.
            </p>
          </div>
          <Discovery
            key={`${params.q ?? ""}:${category}`}
            projects={projects}
            initialQuery={params.q}
            initialCategory={category}
            nextModule={params.next}
          />
        </div>
      }
    </Localized>
  );
}
