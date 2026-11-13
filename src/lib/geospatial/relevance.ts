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
