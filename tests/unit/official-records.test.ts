import { describe, expect, it } from "vitest";
import { officialProjects } from "../../data/official/projects";
import {
  publicationIssues,
  participationStatus,
} from "../../src/lib/evidence/policy";
import { geographicRelationship } from "../../src/lib/geospatial/relevance";
import french from "../../src/lib/i18n/fr.json";
import chinese from "../../src/lib/i18n/zh-CN.json";
import additions from "../../src/lib/i18n/additions.json";
describe("source-backed municipal records", () => {
  it("publishes factual summaries while retaining unknown decisions and dates", () => {
    for (const project of officialProjects) {
      expect(project.synthetic).toBe(false);
      expect(publicationIssues(project)).toEqual([]);
      expect(
        project.sources.every((source) => source.url?.startsWith("https://")),
      ).toBe(true);
    }
    expect(officialProjects[1].status).toBe("Unknown");
    expect(officialProjects[1].decisions[0].date).toBeNull();
    expect(officialProjects[0].status).toBe("Awaiting Additional Approval");
  });
  it("keeps historic closing dates distinct from invented timestamps", () => {
    const opportunity = officialProjects[2].opportunities[0];
    expect(opportunity.deadline).toBeNull();
    expect(opportunity.closedOn).toBe("2026-06-10");
    expect(
      participationStatus(opportunity, false, new Date("2026-06-11T01:00:00Z")),
    ).not.toBe("Closed");
    expect(
      participationStatus(opportunity, false, new Date("2026-06-11T05:00:00Z")),
    ).toBe("Closed");
  });
  it("uses licensed administrative geometry without claiming a road project polygon", () => {
    const wilmot = officialProjects[0].scopes[0];
    expect(
      geographicRelationship([-80.668, 43.404], wilmot.geometry, true),
    ).toBe("Covered by a municipality-wide policy");
    expect(geographicRelationship([-79.38, 43.65], wilmot.geometry, true)).toBe(
      "Outside the municipality-wide policy area",
    );
    expect(officialProjects[2].scopes[0].geometry.type).toBe("LineString");
    expect(officialProjects[2].scopes[0].description).toContain(
      "not an official project boundary",
    );
  });
  it("classifies point proximity without claiming a project area", () => {
    expect(
      geographicRelationship([-80.5, 43.46], {
        type: "Point",
        coordinates: [-80.5, 43.46],
      }),
    ).toBe("Near the recorded point (within 500 m)");
    expect(
      geographicRelationship([-79, 43], {
        type: "Point",
        coordinates: [-80.5, 43.46],
      }),
    ).toBe("Outside the 500 m proximity area");
  });
  it("maintains matching locale catalogues and translations for real summaries", () => {
    expect(Object.keys(french).sort()).toEqual(Object.keys(chinese).sort());
    for (const project of officialProjects)
      for (const text of [
        project.summary,
        project.rationale,
        ...project.decisions.flatMap((d) => [
          d.explanation,
          d.conditions,
          d.uncertainty,
        ]),
      ]) {
        expect(
          (french as Record<string, string>)[text] ||
            (additions as Record<string, { fr: string }>)[text]?.fr,
          text,
        ).toBeTruthy();
        expect(
          (chinese as Record<string, string>)[text] ||
            (additions as Record<string, { "zh-CN": string }>)[text]?.["zh-CN"],
          text,
        ).toBeTruthy();
      }
  });
});
