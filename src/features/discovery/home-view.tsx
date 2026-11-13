"use client";
import { Localized } from "@/lib/i18n/provider";
import Link from "next/link";
import {
  Search,
  ArrowRight,
  ArrowUpRight,
  GitBranch,
  MapPin,
  FileCheck2,
  MessagesSquare,
  Navigation,
  Compass,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { ProjectCard, SectionTitle } from "@/components/ui/shared";
import type { CivicProject } from "@/lib/validation/project";
export function HomeView({ projects }: { projects: CivicProject[] }) {
  const decisions = projects.reduce((n, p) => n + p.decisions.length, 0),
    sources = projects.reduce((n, p) => n + p.sources.length, 0);
  return (
    <Localized>
      {
        <div className="page overview-page">
          <div className="overview-intro">
            <div>
              <h1>
                Understand the decisions
                <br />
                shaping your community<span className="teal-text">.</span>
              </h1>
              <p className="hero-description">
                From the first proposal to the final decision, follow what
                changed,
                <br className="desktop-only" /> why it matters, and the evidence
                behind it.
              </p>
              <form className="hero-search" action="/explore">
                <Search size={21} />
                <label htmlFor="overview-search" className="sr-only">
                  Search your community
                </label>
                <input
                  id="overview-search"
                  name="q"
                  placeholder="Search a community, project, or topic"
                />
                <button type="submit" aria-label="Search projects">
                  <ArrowRight size={21} />
                </button>
              </form>
              <div className="hero-actions">
                <Link className="button primary" href="/explore">
                  Explore Decisions <ArrowRight size={16} />
                </Link>
                <Link className="text-link" href="/about">
                  How CivicTrace works <ArrowUpRight size={15} />
                </Link>
              </div>
            </div>
            <div
              className="trace-illustration"
              aria-label="A decision connects a source document, an amendment, public input, and the next step"
            >
              <div className="trace-grid" />
              <div className="trace-node node-source">
                <span className="node-icon">
                  <FileText size={19} />
                </span>
                <div>
                  <small>01 · THE SOURCE</small>
                  <strong>Source documents</strong>
                  <span>Reports, minutes & proposals</span>
                </div>
              </div>
              <div className="trace-connector connector-one" />
              <div className="trace-node node-decision">
                <span className="node-icon">
                  <GitBranch size={21} />
                </span>
                <div>
                  <small>02 · THE DECISION</small>
                  <strong>Decisions</strong>
                  <span>Changes, conditions & context</span>
                </div>
                <span className="node-check">
                  <FileCheck2 size={17} />
                </span>
              </div>
              <div className="trace-connector connector-two" />
              <div className="trace-node node-people">
                <span className="node-icon">
                  <MessagesSquare size={19} />
                </span>
                <div>
                  <small>03 · YOUR COMMUNITY</small>
                  <strong>Participation</strong>
                  <span>Public voice & your next step</span>
                </div>
              </div>
            </div>
          </div>
          <div className="stats-row">
            <div>
              <span className="stat-icon">
                <Compass />
              </span>
              <div>
                <strong>{projects.length.toString().padStart(2, "0")}</strong>
                <span>Real municipal projects</span>
              </div>
            </div>
            <div>
              <span className="stat-icon">
                <GitBranch />
              </span>
              <div>
                <strong>{decisions.toString().padStart(2, "0")}</strong>
                <span>Individual decision trails</span>
              </div>
            </div>
            <div>
              <span className="stat-icon">
                <FileCheck2 />
              </span>
              <div>
                <strong>{sources.toString().padStart(2, "0")}</strong>
                <span>Linked official sources</span>
              </div>
            </div>
          </div>
          <section>
            <SectionTitle title="Projects">
              <Link className="text-link" href="/explore">
                View all decisions <ArrowRight size={16} />
              </Link>
            </SectionTitle>
            <div className="project-grid">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </section>
          <section className="workflow-section">
            <SectionTitle title="Explore CivicTrace" />
            <div className="workflow-grid">
              {[
                {
                  n: "01",
                  icon: Compass,
                  title: "Discover",
                  text: "Find proposals by place and topic.",
                  href: "/explore",
                },
                {
                  n: "02",
                  icon: GitBranch,
                  title: "Understand",
                  text: "Trace changes back to the source.",
                  href: "/explore?next=decisions",
                },
                {
                  n: "03",
                  icon: MessagesSquare,
                  title: "Hear the public",
                  text: "Connect concerns and recorded responses.",
                  href: "/explore?next=public-voice",
                },
                {
                  n: "04",
                  icon: MapPin,
                  title: "Locate relevance",
                  text: "Separate geographic context from impact.",
                  href: "/explore?next=impact",
                },
                {
                  n: "05",
                  icon: Navigation,
                  title: "Find your next step",
                  text: "Check dates and participation evidence.",
                  href: "/explore?next=participation",
                },
                {
                  n: "06",
                  icon: ShieldCheck,
                  title: "Review & publish",
                  text: "Keep human review in the loop.",
                  href: "/studio",
                },
              ].map(({ n, icon: Icon, title, text, href }) => (
                <Link className="workflow-card" href={href} key={n}>
                  <div className="row between">
                    <Icon size={20} />
                    <span>{n}</span>
                  </div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <ArrowUpRight size={16} />
                </Link>
              ))}
            </div>
          </section>
        </div>
      }
    </Localized>
  );
}
