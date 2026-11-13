"use client";
import { Localized } from "@/lib/i18n/provider";

import { useState } from "react";
import { Search, ArrowRight, X, MapPin } from "lucide-react";
import Link from "next/link";
import {
  type CivicProject,
  categories,
  decisionStatuses,
} from "@/lib/validation/project";
import { filterProjects } from "@/lib/evidence/policy";
import { ProjectCard, Empty } from "@/components/ui/shared";
import { ProjectMap } from "@/components/maps/project-map";
export function Discovery({
  projects,
  initialQuery = "",
  initialCategory = "",
  nextModule = "",
}: {
  projects: CivicProject[];
  initialQuery?: string;
  initialCategory?: string;
  nextModule?: string;
}) {
  const [query, setQuery] = useState(initialQuery),
    [municipality, setMunicipality] = useState(""),
    [category, setCategory] = useState(initialCategory),
    [status, setStatus] = useState(""),
    [participation, setParticipation] = useState(""),
    [recent, setRecent] = useState(false),
    [selected, setSelected] = useState("");
  const publicProjects = projects.filter((p) => !p.synthetic);
  const visible = filterProjects(publicProjects, {
    query,
    municipality,
    category,
    status,
    participation,
    recent,
  });
  const chosen = visible.find((p) => p.id === selected);
  const hasFilters = !!(
    query ||
    municipality ||
    category ||
    status ||
    participation ||
    recent
  );
  const validModule = [
    "decisions",
    "public-voice",
    "impact",
    "participation",
  ].includes(nextModule)
    ? nextModule
    : "";
  return (
    <Localized>
      {
        <>
          <div className="discovery-search">
            <Search size={21} />
            <input
              aria-label="Search decisions"
              placeholder="Search a project, neighbourhood, municipality, or topic…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="filters discovery-filters">
            <label className="sr-only" htmlFor="municipality">
              Municipality
            </label>
            <select
              id="municipality"
              value={municipality}
              onChange={(e) => setMunicipality(e.target.value)}
            >
              <option value="">All municipalities</option>
              {[...new Set(publicProjects.map((p) => p.municipality))].map(
                (m) => (
                  <option key={m}>{m}</option>
                ),
              )}
            </select>
            <label className="sr-only" htmlFor="category">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="decision-status">
              Decision status
            </label>
            <select
              id="decision-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All decision stages</option>
              {decisionStatuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="participation-status">
              Participation status
            </label>
            <select
              id="participation-status"
              value={participation}
              onChange={(e) => setParticipation(e.target.value)}
            >
              <option value="">All participation states</option>
              {[
                "Open",
                "Upcoming",
                "Closed",
                "No Verified Opportunity",
                "Verification Required",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={recent}
                onChange={(e) => setRecent(e.target.checked)}
              />
              Updated in 30 days
            </label>
            {hasFilters && (
              <button
                className="text-button"
                onClick={() => {
                  setQuery("");
                  setMunicipality("");
                  setCategory("");
                  setStatus("");
                  setParticipation("");
                  setRecent(false);
                }}
              >
                <X size={14} />
                Clear filters
              </button>
            )}
          </div>
          {validModule && (
            <div className="notice">
              Choose a project to open its {validModule.replace("-", " ")}{" "}
              workspace.
            </div>
          )}
          <div className="discovery-grid">
            <div>
              <div className="row between results-count">
                <strong aria-live="polite">
                  {visible.length}{" "}
                  {visible.length === 1 ? "decision trail" : "decision trails"}
                </strong>
              </div>
              {visible.length ? (
                visible.map((p) => (
                  <div key={p.id}>
                    <ProjectCard
                      project={p}
                      selected={selected === p.id}
                      onSelect={() => setSelected(p.id)}
                    />
                    {validModule && (
                      <Link
                        className="module-open"
                        href={`/projects/${p.id}/${validModule}`}
                      >
                        Open selected module <ArrowRight size={15} />
                      </Link>
                    )}
                  </div>
                ))
              ) : (
                <Empty title="No matching decisions">
                  Try a broader search or clear your filters.
                </Empty>
              )}
            </div>
            <div className="discovery-map-column">
              <div className="panel map-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Your community, in context</h3>
                  </div>
                  <MapPin size={19} />
                </div>
                <ProjectMap
                  projects={visible}
                  selectedId={chosen?.id}
                  onSelect={setSelected}
                />
                {chosen && (
                  <div className="map-selection">
                    <strong>{chosen.title}</strong>
                    <Link className="text-link" href={`/projects/${chosen.id}`}>
                      Open project <ArrowRight size={15} />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      }
    </Localized>
  );
}
