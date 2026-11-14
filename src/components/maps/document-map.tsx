"use client";
import { useEffect, useMemo, useState } from "react";
import type { CivicProject } from "@/lib/validation/project";
import {
  documentLocations,
  locateDocumentPlace,
} from "@/lib/geospatial/document-locations";
import { ProjectMap } from "./project-map";
import { EvidenceButton } from "@/components/evidence/evidence-provider";

export function DocumentMap({
  project,
  preview,
}: {
  project: CivicProject;
  preview: boolean;
}) {
  const places = useMemo(() => documentLocations(project), [project]);
  const [located, setLocated] = useState<{
    signature: string;
    scopes: CivicProject["scopes"];
    message: string;
  }>({ signature: "", scopes: [], message: "" });
  const signature = JSON.stringify([project.id, project.municipality, places]);
  useEffect(() => {
    const controller = new AbortController();
    const key = process.env.NEXT_PUBLIC_ARCGIS_API_KEY?.trim();
    const targets = places.slice(0, 20);
    async function locate() {
      if (!targets.length || !key) {
        setLocated({
          signature,
          scopes: [],
          message: targets.length
            ? "Automatic location matching needs ArcGIS geocoding access. Document locations remain listed below."
            : "Municipal context map. No specific project address has been extracted.",
        });
        return;
      }
      const results = await Promise.allSettled(
        targets.map(async (place, i) => {
          const match = await locateDocumentPlace(
            place,
            project.municipality,
            key!,
            controller.signal,
          );
          if (!match) return null;
          return {
            id: `${project.id}-esri-display-${i}`,
            decisionId: project.decisions[0].id,
            label: place.label,
            kind: "Study area" as const,
            geometry: {
              type: "Point" as const,
              coordinates: match.coordinates,
            },
            description: `Esri reference location: ${match.address}. ${place.kind === "site" ? "Address reference point" : "Area or corridor reference point"}; not a project boundary.`,
            evidenceId: place.evidenceId,
          };
        }),
      );
      if (controller.signal.aborted) return;
      const scopes = results.flatMap((result) =>
        result.status === "fulfilled" && result.value ? [result.value] : [],
      );
      const failed = results.find((result) => result.status === "rejected");
      setLocated({
        signature,
        scopes,
        message: `${failed?.status === "rejected" && failed.reason instanceof Error ? (preview ? failed.reason.message : "Address matching is temporarily unavailable. Document locations remain available below.") + " " : ""}${scopes.length} of ${places.length} document locations matched. Markers are reference points, not project boundaries.${scopes.length < places.length ? " Unmatched or ambiguous locations remain listed below for review." : ""}`,
      });
    }
    void locate();
    return () => controller.abort();
  }, [
    signature,
    places,
    project.id,
    project.municipality,
    project.decisions,
    preview,
  ]);
  const current = located.signature === signature ? located : null;
  const mapped = {
    ...project,
    scopes: [...project.scopes, ...(current?.scopes ?? [])],
  };
  return (
    <section className="panel" data-document-map>
      <h2>Project location</h2>
      <p role="status">
        {current?.message ?? "Matching document locations with Esri…"}
      </p>
      <ProjectMap
        projects={[mapped]}
        selectedId={project.id}
        focusRequest={current?.scopes.length ?? 0}
        detailed
        showSelectionSummary={false}
        preview={preview}
      />
      <ul>
        {places.map((place) => (
          <li key={place.evidenceId}>
            {place.label} <EvidenceButton id={place.evidenceId} />
          </li>
        ))}
      </ul>
    </section>
  );
}
