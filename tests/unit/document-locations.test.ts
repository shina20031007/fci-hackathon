import { afterEach, expect, it, vi } from "vitest";
import { locateDocumentPlace } from "../../src/lib/geospatial/document-locations";
const place = {
  type: "document-location" as const,
  label: "100 Queen Street West",
  kind: "site" as const,
  evidenceId: "source-location",
};
afterEach(() => vi.unstubAllGlobals());
it("uses temporary Esri geocoding with explicit geographic precision", async () => {
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      candidates: [
        {
          address: "100 Queen St W, Toronto",
          score: 100,
          location: { x: -79.38, y: 43.65 },
          attributes: { Addr_type: "PointAddress", Country: "CAN" },
        },
      ],
    }),
  });
  vi.stubGlobal("fetch", fetcher);
  expect(
    (await locateDocumentPlace(place, "Toronto", "test-only"))?.coordinates,
  ).toEqual([-79.38, 43.65]);
  const url = new URL(fetcher.mock.calls[0][0]);
  expect(url.searchParams.get("forStorage")).toBe("false");
  expect(url.searchParams.get("SingleLine")).toContain("100 Queen Street West");
});
it("refuses a city centroid for a street address and ambiguous matches", async () => {
  const candidate = {
    address: "Toronto",
    score: 100,
    location: { x: -79.38, y: 43.65 },
    attributes: { Addr_type: "Locality", Country: "CAN" },
  };
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ candidates: [candidate] }),
  });
  vi.stubGlobal("fetch", fetcher);
  expect(await locateDocumentPlace(place, "Toronto", "test-only")).toBeNull();
  candidate.attributes.Addr_type = "PointAddress";
  fetcher.mockResolvedValue({
    ok: true,
    json: async () => ({
      candidates: [candidate, { ...candidate, address: "Different address" }],
    }),
  });
  expect(await locateDocumentPlace(place, "Toronto", "test-only")).toBeNull();
});
