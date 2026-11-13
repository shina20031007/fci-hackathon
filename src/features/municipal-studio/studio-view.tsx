"use client";
import { Localized } from "@/lib/i18n/provider";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { CreateProject } from "@/features/municipal-studio/create-project";
import { Badge } from "@/components/ui/shared";
import { LocalizedDate } from "@/lib/i18n/provider";
type StudioRow = {
  id: string;
  title: string;
  synthetic: boolean;
  revision: number;
  reviewStatus: string;
  updatedAt: string;
  publication: { revision: number } | null;
};
export function StudioView({
  enabled,
  projects,
}: {
  enabled: boolean;
  projects: StudioRow[];
}) {
  if (!enabled)
    return (
      <Localized>
        {
          <div className="page">
            <h1>Municipal Studio is disabled.</h1>
            <p>
              Enable STUDIO_ENABLED in the local environment to review drafts.
              Public browsing remains available.
            </p>
          </div>
        }
      </Localized>
    );
  return (
    <Localized>
      {
        <div className="page">
          <div className="page-heading row between">
            <div>
              <p className="eyebrow">06 / MUNICIPAL REVIEW STUDIO</p>
              <h1>Clear information starts with careful review.</h1>
              <p>
                Edit the explanation. Check the evidence. Publish with
                intention.
              </p>
            </div>
          </div>
          <div className="notice">
            <ShieldCheck size={23} />
            <div>
              <strong>Local hackathon review workspace</strong>
              <p>
                No authentication or role-based authorization is implemented.
                Keep this server on loopback. A public municipal deployment
                requires access controls and a security review.
              </p>
            </div>
          </div>
          <div className="section-heading">
            <div>
              <h2>Project workspace</h2>
              <p className="muted">
                Drafts are separate from the published resident record.
              </p>
            </div>
            <CreateProject />
          </div>
          <div className="studio-project-list">
            {projects.map((p) => (
              <Link
                className="panel studio-project"
                href={`/studio/${p.id}`}
                key={p.id}
              >
                <div className="studio-project-icon">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3>{p.title}</h3>
                  <p className="small muted">
                    {p.synthetic ? "Fictional example" : "Real municipal case"}{" "}
                    · Draft revision {p.revision} ·{" "}
                    {p.publication
                      ? `Published revision ${p.publication.revision}`
                      : "Not published"}{" "}
                    · Updated {<LocalizedDate value={p.updatedAt} />}
                  </p>
                </div>
                <Badge tone={p.reviewStatus === "Published" ? "teal" : "blue"}>
                  {p.reviewStatus}
                </Badge>
                <ArrowUpRight size={20} />
              </Link>
            ))}
          </div>
        </div>
      }
    </Localized>
  );
}
