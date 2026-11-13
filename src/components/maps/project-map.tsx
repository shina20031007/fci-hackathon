"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Layers, LocateFixed } from "lucide-react";
import type { CivicProject } from "@/lib/validation/project";
import type { MapRuntime } from "./arcgis-runtime";
import { geographicRelationship } from "@/lib/geospatial/relevance";
import { EvidenceButton } from "@/components/evidence/evidence-provider";
import { Localized, useLanguage } from "@/lib/i18n/provider";
import { projectParticipation } from "@/lib/evidence/policy";
type Props = {
  projects: CivicProject[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  detailed?: boolean;
};
const hasKey = Boolean(process.env.NEXT_PUBLIC_ARCGIS_API_KEY?.trim());
export function ProjectMap({
  projects,
  selectedId,
  onSelect,
  detailed = false,
}: Props) {
  const container = useRef<HTMLDivElement>(null),
    runtime = useRef<MapRuntime | null>(null);
  const latest = useRef({ projects, onSelect });
  const { locale, t } = useLanguage();
  const translator = useRef(t);
  const [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const [serviceErrors, setServiceErrors] = useState({
    basemap: "",
    search: "",
  });
  const [fallbackRoads, setFallbackRoads] = useState(false);
  const [hidden, setHidden] = useState<string[]>([]),
    [base, setBase] = useState("roads"),
    [roads, setRoads] = useState(false);
  const [location, setLocation] = useState<[number, number] | null>(null),
    [activeId, setActiveId] = useState(selectedId ?? "");
  const [longitude, setLongitude] = useState("-80.5"),
    [latitude, setLatitude] = useState("43.46");
  useEffect(() => {
    latest.current = { projects, onSelect };
    translator.current = t;
  });
  useEffect(() => {
    let disposed = false;
    const node = container.current;
    const timeout = window.setTimeout(() => {
      if (!runtime.current)
        setError(
          "The map is taking longer to load. Geographic records remain available below.",
        );
    }, 20000);
    import("./arcgis-runtime")
      .then(async ({ createCivicMap }) => {
        if (disposed || !node) return;
        const map = await createCivicMap(node, {
          onLocation: setLocation,
          onProject: (id) => {
            setActiveId(id);
            latest.current.onSelect?.(id);
          },
          onError: () =>
            setError(
              "A map service is unavailable. Use the source-linked text records below.",
            ),
          onServiceError: (service, message) => {
            if (!disposed) {
              setServiceErrors((previous) => ({
                ...previous,
                [service]: message,
              }));
              if (service === "basemap" && !message) setFallbackRoads(false);
            }
          },
          onBasemapFallback: () => {
            if (!disposed) {
              setFallbackRoads(true);
              setBase("roads");
            }
          },
          translate: (text) => translator.current(text),
        });
        if (disposed) {
          map.destroy();
          return;
        }
        runtime.current = map;
        setReady(true);
        setError("");
        window.clearTimeout(timeout);
      })
      .catch(() => {
        if (!disposed)
          setError(
            "Interactive map unavailable on this device. Use the geographic records below.",
          );
      });
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      runtime.current?.destroy();
      runtime.current = null;
      node?.replaceChildren();
    };
  }, []);
  useEffect(() => {
    runtime.current?.render(projects, hidden, (text) =>
      translator.current(text),
    );
  }, [projects, hidden, ready, locale]);
  useEffect(() => {
    runtime.current?.setBasemap(base);
  }, [base, ready]);
  useEffect(() => {
    runtime.current?.setRoads(roads);
  }, [roads, ready]);
  useEffect(() => {
    if (location) runtime.current?.setLocation(location);
  }, [location, ready]);
  useEffect(() => {
    if (selectedId)
      runtime.current?.focus(
        latest.current.projects.find((p) => p.id === selectedId),
      );
  }, [selectedId, ready]);
  const kinds = [
    ...new Set(projects.flatMap((p) => p.scopes.map((s) => s.kind))),
  ];
  const chosen = projects.find((p) => p.id === (selectedId || activeId));
  function select(id: string) {
    setActiveId(id);
    onSelect?.(id);
    runtime.current?.focus(projects.find((p) => p.id === id));
  }
  return (
    <Localized>
      <div className="map-wrap">
        <div className="map-toolbar">
          <label>
            Basemap
            <select
              aria-label="Basemap"
              value={base}
              onChange={(e) => setBase(e.target.value)}
            >
              <option value="roads">
                {hasKey && !fallbackRoads
                  ? "Roads (Esri)"
                  : "Roads (OpenStreetMap)"}
              </option>
              <option value="imagery" disabled={!hasKey}>
                Satellite imagery
              </option>
              <option value="gray" disabled={!hasKey}>
                Light gray
              </option>
            </select>
          </label>
          <button
            className="button secondary"
            onClick={() => runtime.current?.reset()}
          >
            <LocateFixed size={16} />
            Reset Waterloo extent
          </button>
        </div>
        <div
          className="map-canvas"
          ref={container}
          role="region"
          aria-label="Interactive project geography. A text alternative follows the map."
        />
        {!ready && (
          <p role="status" className="map-notice">
            Loading geographic view…
          </p>
        )}
        {error && (
          <p role="status" className="map-notice">
            {error}
          </p>
        )}
        {Object.entries(serviceErrors)
          .filter(([, message]) => message)
          .map(([service, message]) => (
            <p role="status" className="map-notice" key={service}>
              {message}
            </p>
          ))}
        <div className="map-controls">
          <Layers size={16} />
          <strong>Layers</strong>
          {kinds.map((kind) => (
            <label key={kind}>
              <input
                type="checkbox"
                checked={!hidden.includes(kind)}
                onChange={() =>
                  setHidden(
                    hidden.includes(kind)
                      ? hidden.filter((k) => k !== kind)
                      : [...hidden, kind],
                  )
                }
              />
              {kind}
            </label>
          ))}
          <label>
            <input
              type="checkbox"
              checked={roads}
              onChange={(e) => setRoads(e.target.checked)}
            />
            Official road network (context)
          </label>
        </div>
        <details className="coordinate-entry">
          <summary>Choose coordinates without using the map</summary>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const x = Number(longitude),
                y = Number(latitude);
              if (
                !Number.isFinite(x) ||
                !Number.isFinite(y) ||
                x < -180 ||
                x > 180 ||
                y < -90 ||
                y > 90
              ) {
                setError("Enter valid longitude and latitude.");
                return;
              }
              setError("");
              setLocation([x, y]);
              runtime.current?.goTo([x, y]);
            }}
          >
            <label>
              Longitude
              <input
                type="number"
                min="-180"
                max="180"
                step="any"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </label>
            <label>
              Latitude
              <input
                type="number"
                min="-90"
                max="90"
                step="any"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
            </label>
            <button className="button secondary">Check location</button>
          </form>
        </details>
        <div className="map-project-list" aria-label="Map projects">
          {projects.map((p) => (
            <button
              className="text-button"
              aria-pressed={p.id === (selectedId || activeId)}
              key={p.id}
              onClick={() => select(p.id)}
            >
              {p.title}
            </button>
          ))}
        </div>
        {chosen && (
          <div className="map-selection">
            <strong>{chosen.title}</strong>
            <p>
              {chosen.status} · {projectParticipation(chosen)}
            </p>
            <Link href={`/projects/${chosen.id}/decisions`}>Decision DNA</Link>{" "}
            ·{" "}
            <Link href={`/projects/${chosen.id}/public-voice`}>
              Public Voice
            </Link>{" "}
            ·{" "}
            <Link href={`/projects/${chosen.id}/participation`}>
              Action Navigator
            </Link>
          </div>
        )}
        <section
          className="geography-details"
          aria-label="Geographic text alternative"
        >
          <h3>Geographic records and limitations</h3>
          <p>
            Administrative boundaries describe policy coverage. Dashed road
            lines show context. A calculated 500 m distance is a system
            proximity rule, not an official impact area.
          </p>
          {location && (
            <p role="status">
              Selected coordinates: {location[0].toFixed(5)},{" "}
              {location[1].toFixed(5)}
            </p>
          )}
          {projects.map((p) => (
            <div key={p.id}>
              <h4>{p.title}</h4>
              {!p.scopes.length && (
                <p>No official geographic extent provided.</p>
              )}
              {p.scopes.map((s) => (
                <div className="scope-record" key={s.id}>
                  <button className="text-button" onClick={() => select(p.id)}>
                    {s.kind}
                  </button>
                  {p.synthetic && <strong>Fictional example</strong>}
                  <p>{s.description}</p>
                  {location && (
                    <p className="notice">
                      {geographicRelationship(
                        location,
                        s.geometry,
                        s.kind === "Municipality boundary",
                      )}
                    </p>
                  )}
                  {s.kind === "Transportation feature" && !p.synthetic && (
                    <p>
                      No licensed official project polygon is provided. The
                      recorded line is derived corridor context.
                    </p>
                  )}
                  {detailed && <EvidenceButton id={s.evidenceId} />}
                  <div className="row">
                    <Link
                      className="text-link"
                      href={`/projects/${p.id}/decisions#${s.decisionId}`}
                    >
                      Related decision
                    </Link>
                    <Link
                      className="text-link"
                      href={`/projects/${p.id}/participation`}
                    >
                      Participation
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>
        <p className="map-caption">
          <a
            href="https://www.regionofwaterloo.ca/government-and-council/transparency-and-accountability/open-data/"
            target="_blank"
            rel="noreferrer"
          >
            Contains information provided by the Regional Municipality of
            Waterloo under licence
          </a>
          . © OpenStreetMap contributors.{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            OpenStreetMap licence
          </a>
          .
        </p>
      </div>
    </Localized>
  );
}
