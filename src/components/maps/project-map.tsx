"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Layers, LocateFixed } from "lucide-react";
import type { CivicProject } from "@/lib/validation/project";
import type { MapRuntime } from "./arcgis-runtime";
import { mapScopeLayer, corridorColor } from "@/lib/geospatial/relevance";
import { Localized, useLanguage } from "@/lib/i18n/provider";
import { projectParticipation } from "@/lib/evidence/policy";
type Props = {
  projects: CivicProject[];
  selectedId?: string;
  focusRequest?: number;
  onSelect?: (id: string) => void;
  detailed?: boolean;
  showSelectionSummary?: boolean;
  city?: "Toronto" | "Waterloo";
  preview?: boolean;
  searchLocation?: [number, number] | null;
};
const hasKey = Boolean(process.env.NEXT_PUBLIC_ARCGIS_API_KEY?.trim());
export function ProjectMap({
  projects,
  selectedId,
  focusRequest,
  onSelect,
  city = "Waterloo",
  preview = false,
  searchLocation,
  showSelectionSummary = true,
}: Props) {
  const toronto =
    city === "Toronto" ||
    projects.find((p) => p.id === selectedId)?.municipality === "Toronto" ||
    (projects.length > 0 &&
      projects.every((p) => p.municipality === "Toronto"));
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
  const [longitude, setLongitude] = useState(toronto ? "-79.41" : "-80.5"),
    [latitude, setLatitude] = useState(toronto ? "43.66" : "43.46");
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
          city: toronto ? "Toronto" : "Waterloo",
          preview,
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
        if (toronto) map.goTo([-79.39, 43.7], 11);
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
  }, [toronto, preview]);
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
    if (!searchLocation || !ready) return;
    runtime.current?.setLocation(searchLocation);
    runtime.current?.goTo(searchLocation, 14);
  }, [searchLocation, ready]);
  useEffect(() => {
    if (selectedId)
      runtime.current?.focus(
        latest.current.projects.find((p) => p.id === selectedId),
      );
  }, [selectedId, ready, focusRequest]);
  useEffect(() => {
    if (ready && !selectedId && city === "Toronto")
      runtime.current?.fit(projects);
  }, [ready, selectedId, projects, city]);
  const layerLabel = (kind: string) =>
    toronto && projects.some((p) => p.id.startsWith("rapidto-"))
      ? ({
          "Study area": "Study / Planning Corridor",
          "Planning area": "Council-approved Segment",
          "Transportation feature": "Installed Transit Priority Segment",
        }[kind] ?? kind)
      : kind;
  const kinds = [
    ...new Set(projects.flatMap((p) => p.scopes.map(mapScopeLayer))),
  ];
  const hasTransit = projects.some((p) =>
    p.scopes.some((s) => s.id.includes("-ttc-")),
  );
  const chosen = projects.find((p) => p.id === (selectedId || activeId));
  function detailPath(id: string, section: string) {
    if (id.startsWith("rapidto-"))
      return `/projects/toronto-2024-ex11-8/corridors/${id.slice(8)}${preview ? "?preview=1" : ""}#${section === "decisions" ? "timeline" : section === "public-voice" ? "public-voice" : "participation"}`;
    return `/projects/${id}/${section}`;
  }
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
            onClick={() =>
              toronto
                ? runtime.current?.goTo([-79.39, 43.7], 11)
                : runtime.current?.reset()
            }
          >
            <LocateFixed size={16} />
            {toronto ? "Reset Toronto extent" : "Reset Waterloo extent"}
          </button>
        </div>
        {hasTransit && (
          <div className="map-route-legend" aria-label={t("Corridor colours")}>
            {projects
              .filter((p) => p.scopes.some((s) => s.id.includes("-ttc-")))
              .map((p) => (
                <button
                  key={p.id}
                  className="text-button"
                  aria-pressed={p.id === (selectedId || activeId)}
                  onClick={() => select(p.id)}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      borderTop: `4px dashed ${corridorColor(p.id)}`,
                    }}
                  />
                  {p.title.replace("RapidTO: ", "")}
                </button>
              ))}
            <p>
              {t(
                "Dashed lines: TTC scheduled route patterns. Solid lines: installed RapidTO reference segments.",
              )}
            </p>
          </div>
        )}
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
              {layerLabel(kind)}
            </label>
          ))}
          {!toronto && (
            <label>
              <input
                type="checkbox"
                checked={roads}
                onChange={(e) => setRoads(e.target.checked)}
              />
              Official road network (context)
            </label>
          )}
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
        {location && (
          <p role="status" className="map-notice">
            Selected coordinates: {location[0].toFixed(5)},{" "}
            {location[1].toFixed(5)}
          </p>
        )}
        {showSelectionSummary && chosen && chosen.category !== "Housing" && (
          <div className="map-selection">
            <strong>{chosen.title}</strong>
            <p>
              {chosen.status} · {projectParticipation(chosen)}
            </p>
            <Link href={detailPath(chosen.id, "decisions")}>Decision DNA</Link>{" "}
            ·{" "}
            <Link href={detailPath(chosen.id, "public-voice")}>
              Public Voice
            </Link>{" "}
            ·{" "}
            <Link href={detailPath(chosen.id, "participation")}>
              Action Navigator
            </Link>
          </div>
        )}
        <div className="sr-only" aria-label="Geographic text alternative">
          <h3>Project locations in text</h3>
          {projects.map((p) => (
            <p key={p.id}>
              {p.title}:{" "}
              {p.scopes
                .filter((scope) => !scope.id.includes("-ttc-"))
                .map((scope) => scope.label)
                .join("; ") || p.neighbourhood}
            </p>
          ))}
        </div>
        <p className="map-caption">
          <a
            href={
              toronto
                ? "https://open.toronto.ca/open-data-licence/"
                : "https://www.regionofwaterloo.ca/government-and-council/transparency-and-accountability/open-data/"
            }
            target="_blank"
            rel="noreferrer"
          >
            {toronto
              ? "Contains information licensed under the Open Government Licence – Toronto."
              : "Contains information provided by the Regional Municipality of Waterloo under licence"}
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
