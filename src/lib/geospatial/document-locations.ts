import type { CivicProject } from "@/lib/validation/project";
import { z } from "zod";
const metadata = z.object({
  type: z.literal("document-location"),
  label: z.string().min(1),
  kind: z.enum(["site", "corridor", "area", "citywide"]),
});
export function documentLocations(project: CivicProject) {
  return project.evidence.flatMap((e) => {
    try {
      const value = metadata.parse(JSON.parse(e.notes));
      return [{ ...value, evidenceId: e.id }];
    } catch {
      return [];
    }
  });
}
export type DocumentLocation = ReturnType<typeof documentLocations>[number];
export async function locateDocumentPlace(
  place: DocumentLocation,
  municipality: string,
  key: string,
  signal?: AbortSignal,
) {
  // Temporary display only: these results never enter the project database/snapshot.
  const params = new URLSearchParams({
    f: "json",
    SingleLine: [
      place.label,
      municipality === "Municipality not confirmed" ? "" : municipality,
      "Canada",
    ]
      .filter(Boolean)
      .join(", "),
    sourceCountry: "CAN",
    outSR: "4326",
    maxLocations: "2",
    outFields: "Addr_type,City,Region,Country",
    forStorage: "false",
    token: key,
  });
  const response = await fetch(
    `https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?${params}`,
    {
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000),
    },
  );
  const data = await response.json();
  if (data.error?.code === 498 || data.error?.code === 499)
    throw new Error(
      "Esri rejected the API key (498/499). Update the local ArcGIS key and restart the app.",
    );
  if (!response.ok || data.error)
    throw new Error(
      "Esri address matching is unavailable. Check geocoding permissions and allowed referrers.",
    );
  const candidates = z
    .array(
      z.object({
        address: z.string(),
        score: z.number(),
        location: z.object({
          x: z.number().min(-180).max(180),
          y: z.number().min(-90).max(90),
        }),
        attributes: z
          .object({ Addr_type: z.string(), Country: z.string().optional() })
          .passthrough(),
      }),
    )
    .parse(data.candidates ?? []);
  const first = candidates[0];
  const allowed =
    place.kind === "site"
      ? ["PointAddress", "Subaddress", "StreetAddress", "POI"]
      : place.kind === "corridor"
        ? ["StreetName", "StreetInt", "StreetBetween"]
        : ["Locality", "POI"];
  if (
    !first ||
    first.score < 95 ||
    !allowed.includes(first.attributes.Addr_type) ||
    (first.attributes.Country &&
      !["CAN", "CA", "Canada"].includes(first.attributes.Country)) ||
    (candidates[1] && first.score - candidates[1].score < 2)
  )
    return null;
  return {
    coordinates: [first.location.x, first.location.y] as [number, number],
    address: first.address,
  };
}
