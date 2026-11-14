"use client";
import { Localized } from "@/lib/i18n/provider";

import { useEffect, useState } from "react";
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
import { projectProximity } from "@/lib/geospatial/relevance";
const addressPattern =
  /^\d{1,6}\s+.+\b(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|crescent|court|rue|chemin)\b/i;
type AddressResult = {
  query: string;
  label: string;
  location: [number, number];
};
type GeocodeResponse = {
  error?: { code?: number };
  candidates?: {
    address: string;
    score: number;
    location: { x: number; y: number };
    attributes?: { Addr_type?: string };
  }[];
};
const addressLookups = new Map<string, Promise<GeocodeResponse>>();
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
    [selected, setSelected] = useState(""),
    [focusRequest, setFocusRequest] = useState(0),
    [address, setAddress] = useState<AddressResult | null>(null),
    [addressError, setAddressError] = useState(""),
    [addressBusy, setAddressBusy] = useState(false),
    [radius, setRadius] = useState(500);
  useEffect(() => {
    if (initialQuery && addressPattern.test(initialQuery))
      void findAddress(initialQuery);
    // The submitted homepage search is resolved once; typing never calls geocoding.
  }, [initialQuery]);
  async function findAddress(input: string) {
    const key = process.env.NEXT_PUBLIC_ARCGIS_API_KEY?.trim();
    setAddress(null);
    if (!key) {
      setAddressError(
        "Address search is unavailable. Configure ArcGIS geocoding.",
      );
      return;
    }
    setAddressBusy(true);
    setAddressError("");
    try {
      const url = new URL(
        "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates",
      );
      url.search = new URLSearchParams({
        singleLine: input,
        countryCode: "CAN",
        outFields: "Addr_type,Match_addr",
        maxLocations: "2",
        f: "json",
        token: key,
      }).toString();
      let lookup = addressLookups.get(input);
      if (!lookup) {
        lookup = fetch(url, { cache: "no-store" }).then(async (response) => {
          const data = (await response.json()) as GeocodeResponse;
          if (!response.ok || data.error) throw new Error("service");
          return data;
        });
        addressLookups.set(input, lookup);
        void lookup.then(
          () => addressLookups.delete(input),
          () => addressLookups.delete(input),
        );
      }
      const data = await lookup;
      const candidates = (data.candidates ?? []).filter(
        (candidate) =>
          candidate.score >= 85 &&
          ["PointAddress", "StreetAddress", "StreetInt"].includes(
            candidate.attributes?.Addr_type ?? "",
          ) &&
          Number.isFinite(candidate.location.x) &&
          Number.isFinite(candidate.location.y),
      );
      if (!candidates.length) {
        setAddressError(
          "No precise Canadian address found. Add the city and street number.",
        );
        return;
      }
      if (
        candidates.length > 1 &&
        candidates[0].score - candidates[1].score < 5
      ) {
        setAddressError(
          "Several addresses match. Add the municipality or postal code.",
        );
        return;
      }
      const candidate = candidates[0];
      setAddress({
        query: input,
        label: candidate.address,
        location: [candidate.location.x, candidate.location.y],
      });
    } catch {
      addressLookups.delete(input);
      setAddressError("Address search is unavailable. Please try again later.");
    } finally {
      setAddressBusy(false);
    }
  }
  const publicProjects = projects.filter((p) => !p.synthetic);
  const matching = filterProjects(publicProjects, {
    query: address && address.query === query ? "" : query,
    municipality,
    category,
    status,
    participation,
    recent,
  });
  const nearby =
    address && address.query === query
      ? matching
          .map((project) => ({
            project,
            proximity: projectProximity(project, address.location),
          }))
          .filter(({ proximity }) => proximity && proximity.distance <= radius)
          .sort((a, b) => a.proximity!.distance - b.proximity!.distance)
      : null;
  const visible = nearby ? nearby.map(({ project }) => project) : matching;
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
          <form
            className="discovery-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              if (addressPattern.test(query.trim()))
                void findAddress(query.trim());
              else {
                setAddress(null);
                setAddressError("");
              }
            }}
          >
            <Search size={21} />
            <input
              aria-label="Search decisions"
              placeholder="Search a project, topic, or street address…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setAddress(null);
                setAddressError("");
              }}
            />
            <button
              type="submit"
              className="button secondary"
              disabled={addressBusy}
            >
              Search
            </button>
          </form>
          {addressBusy && <p role="status">Finding address…</p>}
          {addressError && <p role="alert">{addressError}</p>}
          {nearby && (
            <div className="address-results" role="status">
              <p>
                Near {address!.label}: projects within {radius.toLocaleString()}{" "}
                m of recorded project geography.
              </p>
              <label>
                Search distance{" "}
                <select
                  value={radius}
                  onChange={(event) => setRadius(Number(event.target.value))}
                >
                  <option value={500}>500 m</option>
                  <option value={1000}>1 km</option>
                  <option value={2000}>2 km</option>
                </select>
              </label>
              <p>
                Distance is a search rule, not an official impact area. Study
                corridors may not be approved for construction. TTC service
                routes and projects without published geography are excluded.
              </p>
              <p>
                Address searches use Esri geocoding. Cityora does not store the
                selected location in its database.
              </p>
            </div>
          )}
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
                  setAddress(null);
                  setAddressError("");
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
                      onSelect={() => {
                        setSelected(p.id);
                        setFocusRequest((value) => value + 1);
                      }}
                    />
                    {nearby && (
                      <p className="address-match">
                        {Math.round(
                          nearby.find((item) => item.project.id === p.id)!
                            .proximity!.distance,
                        )}{" "}
                        m to{" "}
                        {nearby
                          .find((item) => item.project.id === p.id)!
                          .proximity!.kind.toLowerCase()}{" "}
                        reference
                      </p>
                    )}
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
                  searchLocation={nearby ? address!.location : null}
                  selectedId={chosen?.id}
                  focusRequest={focusRequest}
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
