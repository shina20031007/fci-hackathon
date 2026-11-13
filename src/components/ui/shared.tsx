"use client";
import { Localized } from "@/lib/i18n/provider";
import { ArrowUpRight, ArrowRight, FileText, MapPin } from "lucide-react";
import Link from "next/link";
import { LocalizedDate } from "@/lib/i18n/provider";
import { projectParticipation } from "@/lib/evidence/policy";
import type { CivicProject } from "@/lib/validation/project";
export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "teal" | "amber" | "blue";
}) {
  return (
    <Localized>
      {<span className={`badge badge-${tone}`}>{children}</span>}
    </Localized>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <Localized>
      {
        <div className="section-heading">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2>{title}</h2>
            {description && <p className="muted">{description}</p>}
          </div>
          {children}
        </div>
      }
    </Localized>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <Localized>
      {
        <div className="empty">
          <FileText size={30} />
          <h3>{title}</h3>
          <p>{children}</p>
        </div>
      }
    </Localized>
  );
}
export function ProjectCard({
  project,
  selected = false,
  onSelect,
}: {
  project: CivicProject;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <Localized>
      {
        <article className={`project-card ${selected ? "selected" : ""}`}>
          <div className="row between">
            <span className="category">{project.category}</span>
            <Badge tone="amber">
              {project.synthetic ? "Fictional example" : "Municipal record"}
            </Badge>
          </div>
          <h3>
            <Link href={`/projects/${project.id}`}>
              {project.title}
              <ArrowUpRight size={19} />
            </Link>
          </h3>
          <p className="location">
            <MapPin size={13} />
            {project.municipality} · {project.neighbourhood}
          </p>
          <p className="card-description">{project.summary}</p>
          <div className="tags">
            <Badge tone="blue">{project.status}</Badge>
            <Badge
              tone={
                projectParticipation(project) === "Open" ? "teal" : "neutral"
              }
            >
              {project.synthetic ? "Demo: " : ""}
              {projectParticipation(project)}
            </Badge>
          </div>
          <div className="card-footer">
            <span>
              {project.synthetic ? "Demo reviewed" : "Last verified"}{" "}
              {<LocalizedDate value={project.verifiedAt} />}
            </span>
            {onSelect ? (
              <button className="text-button" onClick={onSelect}>
                Locate on map <MapPin size={14} />
              </button>
            ) : (
              <Link className="text-link" href={`/projects/${project.id}`}>
                Follow the decision <ArrowRight size={15} />
              </Link>
            )}
          </div>
          <p className="small muted">
            {project.scopes.length
              ? project.scopes[0].kind
              : "Geographic information unavailable"}
          </p>
        </article>
      }
    </Localized>
  );
}
