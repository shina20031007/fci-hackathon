import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import pointToLineDistance from "@turf/point-to-line-distance";
import type { Geometry } from "@/lib/validation/project";
export function geographicRelationship(
  location: [number, number],
  geometry: Geometry,
  municipalityWide = false,
) {
  if (geometry.type === "Polygon") {
    if (booleanPointInPolygon(location, geometry))
      return municipalityWide
        ? "Covered by a municipality-wide policy"
        : "Inside the recorded project area";
    if (municipalityWide) return "Outside the municipality-wide policy area";
    const distance = Math.min(
      ...geometry.coordinates.map((coordinates) =>
        pointToLineDistance(
          location,
          { type: "LineString", coordinates },
          { units: "meters" },
        ),
      ),
    );
    return distance <= 500
      ? "Near the recorded area (within 500 m)"
      : "Outside the recorded area";
  }
  if (geometry.type === "LineString")
    return pointToLineDistance(location, geometry, { units: "meters" }) <= 500
      ? "Near the recorded feature (within 500 m)"
      : "Outside the 500 m proximity area";
  const radians = (value: number) => (value * Math.PI) / 180;
  const [x, y] = geometry.coordinates;
  const a =
    Math.sin(radians(y - location[1]) / 2) ** 2 +
    Math.cos(radians(location[1])) *
      Math.cos(radians(y)) *
      Math.sin(radians(x - location[0]) / 2) ** 2;
  const distance = 6371008.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return distance <= 500
    ? "Near the recorded point (within 500 m)"
    : "Outside the 500 m proximity area";
}

/** Keep transit service geometry separate from project approval geography. */
export function mapScopeLayer(scope: { id: string; kind: string }) {
  return scope.id.includes("-ttc-")
    ? "TTC scheduled routes"
    : scope.id.includes("-parcel-")
      ? "Reference property parcels"
      : scope.kind;
}
export function corridorColor(id: string) {
  const colors: Record<string, string> = {
    "rapidto-bathurst": "#7c3aad",
    "rapidto-dufferin": "#1265b0",
    "rapidto-eglinton-east": "#b64c00",
    "rapidto-jane": "#08785b",
  };
  return colors[id] ?? "#165c8c";
}

/** Distance to documented project geography, excluding transit service routes. */
export function projectProximity(
  project: { scopes: { id: string; kind: string; geometry: Geometry }[] },
  location: [number, number],
) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const pointDistance = (point: [number, number]) => {
    const dLat = radians(point[1] - location[1]);
    const dLon = radians(point[0] - location[0]);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(radians(location[1])) *
        Math.cos(radians(point[1])) *
        Math.sin(dLon / 2) ** 2;
    return 6371008.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  return project.scopes
    .filter((scope) => !scope.id.includes("-ttc-"))
    .map((scope) => {
      const { geometry } = scope;
      let distance: number;
      if (geometry.type === "Point")
        distance = pointDistance(geometry.coordinates);
      else if (geometry.type === "LineString")
        distance = pointToLineDistance(location, geometry, { units: "meters" });
      else if (booleanPointInPolygon(location, geometry)) distance = 0;
      else
        distance = Math.min(
          ...geometry.coordinates.map((coordinates) =>
            pointToLineDistance(
              location,
              { type: "LineString", coordinates },
              { units: "meters" },
            ),
          ),
        );
      return { distance, kind: scope.kind };
    })
    .sort((a, b) => a.distance - b.distance)[0];
}
