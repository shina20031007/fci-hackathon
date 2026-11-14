import { mapScopeLayer, corridorColor } from "@/lib/geospatial/relevance";
import type { GraphicProperties } from "@arcgis/core/Graphic.js";
import type Point from "@arcgis/core/geometry/Point.js";

import type LayerSearchSource from "@arcgis/core/widgets/Search/LayerSearchSource.js";
import type LocatorSearchSource from "@arcgis/core/widgets/Search/LocatorSearchSource.js";
import type { ArcgisMap } from "@arcgis/map-components/components/arcgis-map/customElement";
import type { ArcgisSearch } from "@arcgis/map-components/components/arcgis-search/customElement";
import type { CivicProject, Geometry } from "@/lib/validation/project";
import { projectParticipation } from "@/lib/evidence/policy";
export const addressLayerUrl =
  "https://utility.arcgis.com/usrsvcs/servers/d4d0c6dedec14e59930688f3830776c6/rest/services/OpenData/OpenData/MapServer/1";
const roadLayerUrl =
  "https://utility.arcgis.com/usrsvcs/servers/ab85e142e5de445aa75a678b049048dd/rest/services/OpenData/OpenData/MapServer/2";
const key = process.env.NEXT_PUBLIC_ARCGIS_API_KEY?.trim();
const colors = ["#165c8c", "#8c4d12", "#465b86"];
export type MapRuntime = Awaited<ReturnType<typeof createCivicMap>>;
export async function createCivicMap(
  container: HTMLDivElement,
  handlers: {
    city?: "Toronto" | "Waterloo";
    preview?: boolean;
    onLocation: (point: [number, number]) => void;
    onProject: (id: string) => void;
    onError: () => void;
    onServiceError: (service: "basemap" | "search", message: string) => void;
    onBasemapFallback: () => void;
    translate: (text: string) => string;
  },
) {
  const loader = await loadArcGIS();
  const ArcGISMap = (await loader.import(
    "@arcgis/core/Map.js",
  )) as typeof import("@arcgis/core/Map.js").default;
  const Basemap = (await loader.import(
    "@arcgis/core/Basemap.js",
  )) as typeof import("@arcgis/core/Basemap.js").default;
  const Graphic = (await loader.import(
    "@arcgis/core/Graphic.js",
  )) as typeof import("@arcgis/core/Graphic.js").default;
  const GraphicsLayer = (await loader.import(
    "@arcgis/core/layers/GraphicsLayer.js",
  )) as typeof import("@arcgis/core/layers/GraphicsLayer.js").default;
  const FeatureLayer = (await loader.import(
    "@arcgis/core/layers/FeatureLayer.js",
  )) as typeof import("@arcgis/core/layers/FeatureLayer.js").default;
  const OpenStreetMapLayer = (await loader.import(
    "@arcgis/core/layers/OpenStreetMapLayer.js",
  )) as typeof import("@arcgis/core/layers/OpenStreetMapLayer.js").default;
  const Point = (await loader.import(
    "@arcgis/core/geometry/Point.js",
  )) as typeof import("@arcgis/core/geometry/Point.js").default;
  const Polyline = (await loader.import(
    "@arcgis/core/geometry/Polyline.js",
  )) as typeof import("@arcgis/core/geometry/Polyline.js").default;
  const Polygon = (await loader.import(
    "@arcgis/core/geometry/Polygon.js",
  )) as typeof import("@arcgis/core/geometry/Polygon.js").default;
  const Extent = (await loader.import(
    "@arcgis/core/geometry/Extent.js",
  )) as typeof import("@arcgis/core/geometry/Extent.js").default;
  const LayerSearchSource = (await loader.import(
    "@arcgis/core/widgets/Search/LayerSearchSource.js",
  )) as typeof import("@arcgis/core/widgets/Search/LayerSearchSource.js").default;
  const LocatorSearchSource = (await loader.import(
    "@arcgis/core/widgets/Search/LocatorSearchSource.js",
  )) as typeof import("@arcgis/core/widgets/Search/LocatorSearchSource.js").default;
  const Collection = (await loader.import(
    "@arcgis/core/core/Collection.js",
  )) as typeof import("@arcgis/core/core/Collection.js").default;
  const webMercatorUtils = (await loader.import(
    "@arcgis/core/geometry/support/webMercatorUtils.js",
  )) as typeof import("@arcgis/core/geometry/support/webMercatorUtils.js");
  function geometry(g: Geometry) {
    const spatialReference = { wkid: 4326 };
    if (g.type === "Point")
      return new Point({
        longitude: g.coordinates[0],
        latitude: g.coordinates[1],
        spatialReference,
      });
    if (g.type === "LineString")
      return new Polyline({ paths: [g.coordinates], spatialReference });
    return new Polygon({ rings: g.coordinates, spatialReference });
  }
  let disposed = false;
  function reportViewError(error: unknown) {
    // A new viewpoint or basemap can cancel work that is no longer needed.
    if (!disposed && (error as { name?: string } | null)?.name !== "AbortError")
      handlers.onError();
  }
  let basemapRequest = 0;
  let fallbackRoads = false;
  let t = handlers.translate;
  const projectsLayer = new GraphicsLayer({ title: "Project geography" });
  const selectedLayer = new GraphicsLayer({ title: "Selected location" });
  const roads = new FeatureLayer({
    url: roadLayerUrl,
    title: "Official road network (context)",
    visible: false,
    popupEnabled: false,
  });
  const streetBasemap = new Basemap({
    baseLayers: [new OpenStreetMapLayer()],
    title: "OpenStreetMap",
  });
  const component = document.createElement("arcgis-map") as ArcgisMap;
  component.map = new ArcGISMap({
    basemap: streetBasemap,
    layers: [roads, projectsLayer, selectedLayer],
  });
  component.setAttribute("center", "-80.5,43.46");
  component.setAttribute("zoom", "10");
  component.style.height = "100%";
  component.style.width = "100%";
  const zoom = document.createElement("arcgis-zoom");
  zoom.setAttribute("slot", "top-left");
  component.append(zoom);
  const search = document.createElement("arcgis-search") as ArcgisSearch;
  search.setAttribute("slot", "top-right");
  search.includeDefaultSourcesDisabled = true;
  const localSearch = new LayerSearchSource({
    layer: new FeatureLayer({ url: addressLayerUrl }),
    searchFields: ["FullAddressWithSettlement", "FullAddress"],
    displayField: "FullAddressWithSettlement",
    outFields: ["FullAddressWithSettlement"],
    exactMatch: false,
    name: "Waterloo Region addresses",
    placeholder: "150 Frederick St",
    maxResults: 6,
    maxSuggestions: 6,
  });
  const canadaSearch = key
    ? new LocatorSearchSource({
        url: "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer",
        apiKey: key,
        countryCode: "CA",
        singleLineFieldName: "SingleLine",
        name: "Canada (Esri)",
        placeholder: "Search a Canadian address",
        outFields: ["Match_addr"],
      })
    : undefined;
  search.sources = new Collection<LayerSearchSource | LocatorSearchSource>(
    handlers.city === "Toronto"
      ? canadaSearch
        ? [canadaSearch]
        : []
      : canadaSearch
        ? [canadaSearch, localSearch]
        : [localSearch],
  );
  search.activeSourceIndex = 0;
  search.addEventListener("arcgisSearchComplete", (event) => {
    if (disposed) return;
    const failure = event.detail.errors?.find(
      (result) => result.source === canadaSearch,
    );
    if (failure && handlers.city === "Toronto") {
      handlers.onServiceError(
        "search",
        "Address search is unavailable. Select a point or enter coordinates.",
      );
    } else if (failure) {
      search.activeSourceIndex = search.sources.indexOf(localSearch);
      handlers.onServiceError(
        "search",
        authorizationFailure(failure.error)
          ? "Canada address search access was denied. Waterloo Region search is available."
          : "Canada address search is unavailable. Waterloo Region search is available.",
      );
    } else if (event.detail.errors?.length) {
      handlers.onServiceError(
        "search",
        "Address search is unavailable. Select a point or enter coordinates.",
      );
    } else {
      handlers.onServiceError("search", "");
    }
  });
  if (search.sources.length) component.append(search);
  container.append(component);
  function selectLocation(point: Point) {
    const geographic = point.spatialReference.isWebMercator
      ? (webMercatorUtils.webMercatorToGeographic(point) as Point)
      : point;
    if (geographic.longitude != null && geographic.latitude != null)
      handlers.onLocation([geographic.longitude, geographic.latitude]);
  }
  component.addEventListener("arcgisViewClick", async (event) => {
    if (event.detail.mapPoint) selectLocation(event.detail.mapPoint);
    const hits = await component.hitTest(event.detail).catch(() => null);
    if (!hits || disposed) return;
    const hit = hits.results.find(
      (r) => r.type === "graphic" && r.graphic.layer === projectsLayer,
    );
    if (hit?.type === "graphic")
      handlers.onProject(hit.graphic.attributes.projectId);
  });
  search.addEventListener("arcgisSelectResult", (event) => {
    const point = event.detail.result.feature.geometry;
    if (point?.type === "point") selectLocation(point as Point);
  });
  component.addEventListener("arcgisViewLayerviewCreateError", (event) => {
    if (disposed || event.detail.error?.name === "AbortError") return;
    const basemap = component.map?.basemap;
    if (
      basemap?.baseLayers.includes(event.detail.layer) ||
      basemap?.referenceLayers.includes(event.detail.layer)
    ) {
      basemapRequest++;
      fallbackRoads = true;
      if (component.map) component.map.basemap = streetBasemap;
      handlers.onBasemapFallback();
      handlers.onServiceError(
        "basemap",
        "Basemap unavailable. Showing OpenStreetMap.",
      );
    } else if (component.map?.layers.includes(event.detail.layer)) {
      handlers.onError();
    }
    // Late failures from a removed basemap must not mark the replacement as failed.
  });
  await component.viewOnReady();
  const view = component.view;
  if (!view) throw Error("Map view unavailable");
  return {
    render(
      projects: CivicProject[],
      hidden: string[],
      translate: (text: string) => string,
    ) {
      t = translate;
      localSearch.name = t("Waterloo Region addresses");
      if (canadaSearch) {
        canadaSearch.name = t("Canada (Esri)");
        canadaSearch.placeholder = t("Search a Canadian address");
      }
      const popup = view.popup;
      const openScopeId = popup?.visible
        ? popup.selectedFeature?.attributes?.scopeId
        : undefined;
      projectsLayer.removeAll();
      projects.forEach((project, index) =>
        project.scopes
          .filter((scope) => !hidden.includes(mapScopeLayer(scope)))
          .forEach((scope) => {
            const shape = geometry(scope.geometry),
              color = scope.id.includes("-ttc-")
                ? corridorColor(project.id)
                : project.id.startsWith("rapidto-")
                  ? scope.kind === "Transportation feature"
                    ? "#08734f"
                    : scope.kind === "Planning area"
                      ? "#165c8c"
                      : "#6e6e6e"
                  : colors[index % colors.length];
            const symbol: GraphicProperties["symbol"] =
              shape.type === "polygon"
                ? {
                    type: "simple-fill",
                    color: [...hexColor(color), 0.12],
                    outline: {
                      color,
                      width: 2,
                      style:
                        scope.kind === "Project boundary"
                          ? "solid"
                          : scope.kind === "Study area"
                            ? "dash-dot"
                            : "dash",
                    },
                  }
                : shape.type === "polyline"
                  ? {
                      type: "simple-line",
                      color,
                      width: scope.id.includes("-ttc-")
                        ? 3
                        : !project.id.startsWith("rapidto-")
                          ? 4
                          : scope.kind === "Study area"
                            ? 8
                            : scope.kind === "Planning area"
                              ? 6
                              : 3,
                      style:
                        !scope.id.includes("-ttc-") &&
                        project.id.startsWith("rapidto-") &&
                        scope.kind === "Transportation feature"
                          ? "solid"
                          : "dash",
                    }
                  : {
                      type: "simple-marker",
                      color,
                      size: 10,
                      outline: { color: "white", width: 2 },
                    };
            projectsLayer.add(
              new Graphic({
                geometry: shape,
                symbol,
                attributes: { projectId: project.id, scopeId: scope.id },
                popupTemplate: {
                  title: project.title,
                  content: () => {
                    const panel = document.createElement("div");
                    for (const text of [
                      t(scope.label),
                      ...(scope.id.includes("-ttc-")
                        ? [t("TTC scheduled routes")]
                        : [
                            t(project.status),
                            t(projectParticipation(project)),
                            t(scope.kind),
                          ]),
                      t(scope.description),
                    ]) {
                      const p = document.createElement("p");
                      p.textContent = text;
                      panel.append(p);
                    }
                    const source = project.sources.find(
                      (source) =>
                        source.id ===
                        project.evidence.find((e) => e.id === scope.evidenceId)
                          ?.sourceId,
                    );
                    if (source?.url) {
                      const a = document.createElement("a");
                      a.href = source.url;
                      a.textContent = t("Open official source");
                      a.target = "_blank";
                      a.rel = "noreferrer";
                      panel.append(a);
                    }
                    const link = document.createElement("a");
                    link.href = project.id.startsWith("rapidto-")
                      ? `/projects/toronto-2024-ex11-8/corridors/${project.id.slice(8)}${handlers.preview ? "?preview=1" : ""}`
                      : handlers.preview
                        ? `/studio/${project.id}/preview`
                        : `/projects/${project.id}`;
                    link.textContent = t(
                      project.id.startsWith("rapidto-")
                        ? "View corridor"
                        : "Project overview",
                    );
                    if (scope.id.includes("-ttc-")) {
                      const number = scope.label.match(/^TTC (\d+)/)?.[1];
                      if (number) {
                        const a = document.createElement("a");
                        a.href = `https://www.ttc.ca/routes-and-schedules/${number}`;
                        a.textContent = t("TTC route and service updates");
                        a.target = "_blank";
                        a.rel = "noreferrer";
                        panel.append(document.createElement("br"), a);
                      }
                    }
                    panel.append(document.createElement("br"), link);
                    return panel;
                  },
                },
              }),
            );
            if (
              scope.id.includes("-ttc-") &&
              scope.id.endsWith("-0") &&
              shape.type === "polyline"
            ) {
              const coordinates =
                scope.geometry.type === "LineString"
                  ? scope.geometry.coordinates
                  : [];
              if (coordinates.length) {
                const middle = coordinates[Math.floor(coordinates.length / 2)];
                projectsLayer.add(
                  new Graphic({
                    geometry: geometry({ type: "Point", coordinates: middle }),
                    symbol: {
                      type: "text",
                      text: scope.label.match(/^TTC \d+/)?.[0] ?? "TTC",
                      color,
                      haloColor: "white",
                      haloSize: 2,
                      font: { size: 11, weight: "bold" },
                      yoffset: 10,
                    },
                    attributes: {
                      projectId: project.id,
                      scopeId: scope.id,
                      annotation: true,
                    },
                  }),
                );
              }
            }
          }),
      );
      if (popup && openScopeId) {
        const updated = projectsLayer.graphics.find(
          (graphic) => graphic.attributes.scopeId === openScopeId,
        );
        if (updated) popup.features = [updated];
        else popup.close();
      }
      // Only the presentation changes; never reset the user's viewpoint on locale changes.
    },
    setLocation(location: [number, number]) {
      selectedLayer.removeAll();
      selectedLayer.add(
        new Graphic({
          geometry: geometry({ type: "Point", coordinates: location }),
          symbol: {
            type: "simple-marker",
            color: "#122e48",
            size: 12,
            outline: { color: "white", width: 3 },
          },
        }),
      );
    },
    setRoads(visible: boolean) {
      roads.visible = visible;
    },
    async setBasemap(name: string) {
      const request = ++basemapRequest;
      if (!component.map || disposed) return;
      if (!key || (name === "roads" && fallbackRoads)) {
        component.map.basemap = streetBasemap;
        return;
      }
      const candidate = new Basemap({
        style: {
          id:
            name === "imagery"
              ? "arcgis/imagery"
              : name === "gray"
                ? "arcgis/light-gray"
                : "arcgis/streets",
          apiKey: key,
        },
      });
      try {
        // Load before swapping: a denied service must not blank the existing map.
        await candidate.loadAll();
        if (disposed || request !== basemapRequest) {
          candidate.destroy();
          return;
        }
        component.map.basemap = candidate;
        fallbackRoads = false;
        handlers.onServiceError("basemap", "");
      } catch (error) {
        candidate.destroy();
        if (disposed || request !== basemapRequest) return;
        fallbackRoads = true;
        component.map.basemap = streetBasemap;
        handlers.onBasemapFallback();
        handlers.onServiceError(
          "basemap",
          authorizationFailure(error)
            ? "Basemap access was denied. Showing OpenStreetMap."
            : "Basemap unavailable. Showing OpenStreetMap.",
        );
      }
    },
    fit(projects: CivicProject[]) {
      const geometries = projects.flatMap((p) => {
        const references = p.scopes.filter((s) => !s.id.includes("-ttc-"));
        return (references.length ? references : p.scopes).map((s) =>
          geometry(s.geometry),
        );
      });
      if (geometries.length)
        void component
          .goTo(geometries, { animate: false })
          .catch(reportViewError);
    },
    focus(project?: CivicProject) {
      const references = project?.scopes.filter((s) => !s.id.includes("-ttc-"));
      const geometries = (
        references?.length ? references : project?.scopes
      )?.map((scope) => geometry(scope.geometry));
      if (geometries?.length)
        void component
          .goTo(geometries, { animate: false })
          .catch(reportViewError);
    },
    goTo(center: [number, number], zoom = 12) {
      void component
        .goTo({ center, zoom }, { animate: false })
        .catch(reportViewError);
    },
    reset() {
      void component
        .goTo(
          new Extent({
            xmin: -80.93,
            ymin: 43.23,
            xmax: -80.02,
            ymax: 43.72,
            spatialReference: { wkid: 4326 },
          }),
          { animate: false },
        )
        .catch(reportViewError);
    },
    destroy() {
      disposed = true;
      basemapRequest++;
      component.remove();
    },
  };
}
function hexColor(hex: string) {
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
}

type ArcGISLoader = { import: (path: string) => Promise<unknown> };
let sdkPromise: Promise<ArcGISLoader> | undefined;
function loadArcGIS(): Promise<ArcGISLoader> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://js.arcgis.com/5.2/";
    const timer = window.setTimeout(
      () => reject(Error("ArcGIS SDK load timed out")),
      30000,
    );
    script.onload = () => {
      window.clearTimeout(timer);
      resolve((window as unknown as { $arcgis: ArcGISLoader }).$arcgis);
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      script.remove();
      sdkPromise = undefined;
      reject(Error("ArcGIS SDK unavailable"));
    };
    document.head.append(script);
  });
  return sdkPromise;
}

// Inspect status codes only; never expose service payloads, URLs or credentials.
function authorizationFailure(error: unknown, depth = 0): boolean {
  if (!error || typeof error !== "object" || depth > 6) return false;
  if (Array.isArray(error))
    return error.some((item) => authorizationFailure(item, depth + 1));
  const record = error as Record<string, unknown>;
  if (
    [record.code, record.httpStatus, record.status].some((code) =>
      [401, 403, 498, 499].includes(Number(code)),
    )
  )
    return true;
  return ["details", "error", "raw", "cause", "errors"].some((name) =>
    authorizationFailure(record[name], depth + 1),
  );
}
