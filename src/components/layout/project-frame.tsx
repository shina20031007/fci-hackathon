"use client";
import { Localized } from "@/lib/i18n/provider";
import Link from "next/link";
import {
  ArrowLeft,
  GitBranch,
  MessagesSquare,
  Map,
  Navigation,
  LayoutDashboard,
} from "lucide-react";
import type { CivicProject } from "@/lib/validation/project";
import { Badge } from "@/components/ui/shared";
import { EvidenceProvider } from "@/components/evidence/evidence-provider";
import { LocalizedDate } from "@/lib/i18n/provider";
export function ProjectFrame({
  project,
  active,
  children,
  preview = false,
}: {
  project: CivicProject;
  active: string;
  children: React.ReactNode;
  preview?: boolean;
}) {
  const tabs = [
    { key: "overview", label: "Project overview", icon: LayoutDashboard },
    { key: "decisions", label: "Decision DNA", icon: GitBranch },
    { key: "public-voice", label: "Public Voice", icon: MessagesSquare },
    { key: "impact", label: "Impact Explorer", icon: Map },
    { key: "participation", label: "Action Navigator", icon: Navigation },
  ];
  return (
    <Localized>
      {
        <EvidenceProvider project={project}>
          <div className="page project-page">
            <Link
              className="back-link"
              href={preview ? `/studio/${project.id}` : "/explore"}
            >
              <ArrowLeft size={15} />
              {preview ? "Back to draft editor" : "All decisions"}
            </Link>
            <div className="project-heading">
              <p className="eyebrow">
                {project.municipality} <span> / </span> {project.category}
              </p>
              <h1>{project.title}</h1>
              <div className="tags">
                <Badge tone="blue">{project.status}</Badge>
                <span className="small muted">
                  {project.synthetic ? "Demo reviewed" : "Last verified"}{" "}
                  {<LocalizedDate value={project.verifiedAt} />}
                </span>
              </div>
            </div>
            {project.synthetic && (
              <div className="demo-banner">
                <span className="demo-dot" />
                <strong>Demonstration data — fictional example.</strong>
                <span>
                  Sources, geography, and dates illustrate the workflow.
                </span>
              </div>
            )}
            {preview ? (
              <div className="notice">
                <strong>Unpublished draft preview.</strong> This view does not
                change the resident portal.
              </div>
            ) : (
              <nav className="project-tabs" aria-label="Project modules">
                {tabs.map(({ key, label, icon: Icon }) => (
                  <Link
                    key={key}
                    aria-current={active === key ? "page" : undefined}
                    className={active === key ? "active" : ""}
                    href={`/projects/${project.id}${key === "overview" ? "" : `/${key}`}`}
                  >
                    <Icon size={16} />
                    {label}
                  </Link>
                ))}
              </nav>
            )}
            {children}
          </div>
        </EvidenceProvider>
      }
    </Localized>
  );
}
