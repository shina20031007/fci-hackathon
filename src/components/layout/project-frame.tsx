"use client";
import { useRef, useState } from "react";
import { Localized, useLanguage } from "@/lib/i18n/provider";
import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";
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
  const housingStage =
    project.category === "Housing" &&
    project.decisions.some((d) => d.id.endsWith("-proposal"))
      ? project.events.find(
          (event) =>
            event.status === "Current" &&
            project.evidence.some(
              (e) =>
                e.id === event.evidenceId &&
                e.verifiedAt &&
                e.state === "Officially Confirmed",
            ),
        )?.title
      : undefined;
  return (
    <Localized>
      {
        <EvidenceProvider project={project}>
          <div className="page project-page">
            {preview ? (
              <Link className="back-link" href={`/studio/${project.id}`}>
                <ArrowLeft size={15} />
                Back to draft editor
              </Link>
            ) : (
              <nav className="civic-breadcrumb" aria-label="Breadcrumb">
                <Link href="/">Home</Link>
                <span aria-hidden="true">/</span>
                <Link href="/explore">All projects</Link>
                <span aria-hidden="true">/</span>
                {active === "overview" ? (
                  <span aria-current="page" translate="no">
                    {project.title}
                  </span>
                ) : (
                  <Link href={`/projects/${project.id}`} translate="no">
                    {project.title}
                  </Link>
                )}
                {active !== "overview" && (
                  <>
                    <span aria-hidden="true">/</span>
                    <span aria-current="page">
                      {
                        (
                          {
                            decisions: "Decision DNA",
                            impact: "Map & impact",
                            "public-voice": "Public voice",
                            participation: "How to participate",
                          } as Record<string, string>
                        )[active]
                      }
                    </span>
                  </>
                )}
              </nav>
            )}
            <div className="project-heading">
              <p className="eyebrow">
                {project.municipality} <span> / </span> {project.category}
              </p>
              <h1>{project.title}</h1>
              <div className="tags">
                <Badge tone="blue">{housingStage ?? project.status}</Badge>
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
              <ProjectNavigation
                key={active}
                projectId={project.id}
                active={active}
              />
            )}
            {children}
          </div>
        </EvidenceProvider>
      }
    </Localized>
  );
}

function ProjectNavigation({
  projectId,
  active,
}: {
  projectId: string;
  active: string;
}) {
  const { t } = useLanguage();
  const [mobile, setMobile] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const base = `/projects/${projectId}`;
  const labels: Record<string, string> = {
    overview: "Project overview",
    decisions: "Decision DNA",
    impact: "Map & impact",
    "public-voice": "Public voice",
    participation: "How to participate",
  };
  return (
    <div
      className="civic-project-wrap"
      onKeyDown={(event) => {
        if (event.key === "Escape" && mobile) {
          setMobile(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        className="civic-project-toggle"
        aria-controls="project-navigation"
        aria-expanded={mobile}
        onClick={() => {
          setMobile(!mobile);
        }}
      >
        {t("Project navigation")}: {t(labels[active])}
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      <nav
        id="project-navigation"
        className="civic-project-nav"
        data-open={mobile}
        aria-label={t("Project modules")}
        onClick={(event) => {
          if ((event.target as Element).closest("a")) {
            setMobile(false);
          }
        }}
      >
        <Link
          href={base}
          aria-current={active === "overview" ? "page" : undefined}
        >
          {t("Project overview")}
        </Link>
        {(["public-voice", "participation"] as const).map((key) => (
          <Link
            key={key}
            href={`${base}/${key}`}
            aria-current={active === key ? "page" : undefined}
          >
            {t(labels[key])}
          </Link>
        ))}
      </nav>
    </div>
  );
}
