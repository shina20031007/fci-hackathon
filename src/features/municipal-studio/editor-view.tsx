"use client";
import { Localized } from "@/lib/i18n/provider";
import Link from "next/link";
import { StudioEditor } from "./studio-editor";
import type { CivicProject } from "@/lib/validation/project";
import type { ComponentProps } from "react";
export function EditorView({
  project,
  reviews,
}: {
  project: CivicProject;
  reviews: ComponentProps<typeof StudioEditor>["reviews"];
}) {
  return (
    <Localized>
      {
        <div className="page studio-page">
          <Link href="/studio" className="back-link">
            ← All review projects
          </Link>
          <div className="page-heading">
            <p className="eyebrow">
              MUNICIPAL STUDIO /{" "}
              {project.synthetic
                ? "FICTIONAL DEMONSTRATION"
                : "MUNICIPAL RECORD"}
            </p>
            <h1>{project.title}</h1>
            <p>
              Review each statement against the record. The resident page
              changes only after publication.
            </p>
          </div>
          <StudioEditor initial={project} reviews={reviews} />
        </div>
      }
    </Localized>
  );
}
