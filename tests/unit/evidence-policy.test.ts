import { describe, it, expect } from "vitest";
import { fixtureProjects } from "../../data/fixtures/projects";
import {
  filterProjects,
  filterFeedback,
  orderedEvents,
  participationStatus,
  publicationIssues,
} from "../../src/lib/evidence/policy";
import {
  projectSchema,
  opportunitySchema,
} from "../../src/lib/validation/project";
import {
  geographicRelationship,
  projectProximity,
  mapScopeLayer,
} from "../../src/lib/geospatial/relevance";
import { diffWords } from "diff";
const now = new Date("2026-11-12T12:00:00Z");
describe("resident discovery and evidence rules", () => {
  it("keeps gaps between reference parcels outside the recorded area", () => {
    const p = structuredClone(fixtureProjects[0]);
    p.scopes = [0, 0.003].map((offset, index) => ({
      ...p.scopes[0],
      id: `housing-parcel-${index}`,
      kind: "Land-use feature" as const,
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [-79.4 + offset, 43.7],
            [-79.399 + offset, 43.7],
            [-79.399 + offset, 43.701],
            [-79.4 + offset, 43.701],
            [-79.4 + offset, 43.7],
          ],
        ] as [number, number][][],
      },
    }));
    expect(projectProximity(p, [-79.398, 43.7005])?.distance).toBeGreaterThan(
      50,
    );
    expect(projectProximity(p, [-79.3995, 43.7005])?.distance).toBe(0);
    expect(mapScopeLayer(p.scopes[0])).toBe("Reference property parcels");
    expect(
      mapScopeLayer({ id: "official-boundary", kind: "Project boundary" }),
    ).toBe("Project boundary");
  });
  it("finds nearby project geography without treating a TTC route as a project boundary", () => {
    const location: [number, number] = [-79.4, 43.7];
    const p = structuredClone(fixtureProjects[0]);
    p.scopes = [
      {
        ...p.scopes[0],
        id: "study",
        kind: "Study area",
        geometry: { type: "Point", coordinates: [-79.401, 43.7] },
      },
      {
        ...p.scopes[0],
        id: "project-ttc-511-0",
        kind: "Transportation feature",
        geometry: { type: "Point", coordinates: location },
      },
    ];
    const match = projectProximity(p, location);
    expect(match?.distance).toBeGreaterThan(50);
    expect(match?.distance).toBeLessThan(500);
    expect(match?.kind).toBe("Study area");
    p.scopes = p.scopes.filter((s) => s.id.includes("-ttc-"));
    expect(projectProximity(p, location)).toBeUndefined();
  });
  it("searches titles, municipality, neighbourhood, category, and keywords", () => {
    for (const q of ["willow", "Riverside", "Transportation", "crossing"])
      expect(
        filterProjects(fixtureProjects, { query: q }, now).map((p) => p.id),
      ).toContain("willow-street");
    expect(
      filterProjects(fixtureProjects, { query: "Fairhaven" }, now),
    ).toHaveLength(3);
    expect(
      filterProjects(fixtureProjects, { query: "not a record" }, now),
    ).toHaveLength(0);
  });
  it("combines category, stage, participation, municipality and recency filters", () => {
    expect(
      filterProjects(
        fixtureProjects,
        {
          category: "Transportation",
          status: "Staff Recommendation",
          participation: "Open",
          municipality: "Fairhaven (fictional)",
          recent: true,
        },
        now,
      ),
    ).toHaveLength(1);
    expect(
      filterProjects(
        fixtureProjects,
        { category: "Transportation", status: "Council Decision" },
        now,
      ),
    ).toHaveLength(0);
    expect(
      filterProjects(fixtureProjects, { recent: true }, new Date("2028-01-01")),
    ).toHaveLength(0);
  });
  it("does not relabel a staff recommendation as council approval", () => {
    expect(fixtureProjects[1].status).toBe("Staff Recommendation");
    expect(fixtureProjects[1].decisions[0].status).toBe("Staff Recommendation");
  });
  it("orders timeline dates regardless of storage order", () => {
    const p = structuredClone(fixtureProjects[0]);
    p.events.reverse();
    expect(orderedEvents(p).map((e) => e.date)).toEqual([
      "2026-06-15",
      "2026-09-10",
      "2026-10-22",
    ]);
  });
  it("compares substantive words, including additions and removals", () => {
    const p = fixtureProjects[1];
    const diff = diffWords(p.versions[0].text, p.versions[1].text);
    expect(diff.some((d) => d.removed && d.value.includes("painted"))).toBe(
      true,
    );
    expect(diff.some((d) => d.added && d.value.includes("protected"))).toBe(
      true,
    );
  });
  it("links every published decision claim to exact supporting evidence", () => {
    for (const p of fixtureProjects) {
      expect(publicationIssues(p)).toEqual([]);
      for (const d of p.decisions)
        for (const id of d.evidenceIds) {
          const e = p.evidence.find((e) => e.id === id);
          expect(e?.excerpt).toBeTruthy();
          expect(p.sources.find((s) => s.id === e?.sourceId)).toBeTruthy();
        }
    }
  });
  it("rejects broken evidence references", () => {
    const p = structuredClone(fixtureProjects[0]);
    p.decisions[0].evidenceIds = ["missing"];
    expect(projectSchema.safeParse(p).success).toBe(false);
    expect(publicationIssues(p).length).toBeGreaterThan(0);
  });
  it("never upgrades fictional evidence to Officially Confirmed", () => {
    const p = structuredClone(fixtureProjects[0]);
    p.evidence[0].state = "Officially Confirmed";
    expect(projectSchema.safeParse(p).success).toBe(false);
  });
  it("blocks unverified claims and missing summary evidence", () => {
    const p = structuredClone(fixtureProjects[0]);
    p.decisions[0].reviewState = "Needs Verification";
    p.summaryEvidenceId = "";
    expect(publicationIssues(p)).toHaveLength(2);
  });
  it("accepts reviewed completion without inventing a day, but rejects unconfirmed or future completion", () => {
    const p = structuredClone(fixtureProjects[0]);
    p.synthetic = false;
    for (const s of p.sources) {
      s.synthetic = false;
      s.url = "https://www.toronto.ca/";
    }
    for (const e of p.evidence) {
      e.state = "Officially Confirmed";
      e.verifiedAt = "2026-01-01T12:00:00Z";
    }
    const event = p.events[0];
    event.status = "Completed";
    event.date = "";
    const completionIssues = () =>
      publicationIssues(p).filter((s) => s.startsWith("Completed timeline"));
    expect(completionIssues()).toHaveLength(1);
    event.completionConfirmedOn = "2026-01-01";
    expect(completionIssues()).toHaveLength(0);
    p.evidence.find((e) => e.id === event.evidenceId)!.verifiedAt = null;
    expect(completionIssues()).toHaveLength(1);
    p.evidence.find((e) => e.id === event.evidenceId)!.verifiedAt =
      "2026-01-01T12:00:00Z";
    event.completionConfirmedOn = "2999-01-01";
    expect(completionIssues()).toHaveLength(1);
    event.completionConfirmedOn = "2026-01-01";
    event.date = "2999-01-01";
    expect(completionIssues()).toHaveLength(1);
  });
  it("filters feedback without treating missing evidence as rejection", () => {
    const p = fixtureProjects[1];
    expect(
      filterFeedback(
        p,
        "Accessibility",
        "Partially Accepted",
        p.decisions[0].id,
      ),
    ).toHaveLength(1);
    expect(
      filterFeedback(p, "Environment", "No Verified Response Found", ""),
    ).toHaveLength(1);
    expect(filterFeedback(p, "Environment", "Not Accepted", "")).toHaveLength(
      0,
    );
  });
  it("does not accept an unsupported response or causal amendment link", () => {
    const p = structuredClone(fixtureProjects[0]);
    p.feedback[1].amendment = "A later amendment was caused by this concern.";
    expect(projectSchema.safeParse(p).success).toBe(false);
  });
});
describe("participation is independent from meeting dates", () => {
  it("computes open, upcoming and historical states from confirmed dates", () => {
    const o = fixtureProjects[1].opportunities[0];
    expect(participationStatus(o, true, now)).toBe("Open");
    expect(participationStatus(o, true, new Date("2026-10-01"))).toBe(
      "Upcoming",
    );
    expect(participationStatus(o, true, new Date("2027-01-01"))).toBe("Closed");
  });
  it("never infers a missing deadline from a meeting timestamp", () => {
    const o = {
      ...fixtureProjects[1].opportunities[0],
      deadline: null,
      meetingAt: "2026-12-15T17:00:00-05:00",
    };
    expect(participationStatus(o, true, now)).toBe("No Verified Opportunity");
    expect(opportunitySchema.parse(o).deadline).toBeNull();
  });
  it("requires participation verification and real official instructions", () => {
    const o = fixtureProjects[1].opportunities[0];
    expect(participationStatus({ ...o, confirmed: false }, true, now)).toBe(
      "Verification Required",
    );
    expect(participationStatus(o, false, now)).toBe("Verification Required");
  });
  it("validates date order, offsets, time zones and safe links", () => {
    const o = fixtureProjects[1].opportunities[0];
    expect(
      opportunitySchema.safeParse({ ...o, deadline: o.opensAt }).success,
    ).toBe(false);
    expect(
      opportunitySchema.safeParse({ ...o, timeZone: "made-up" }).success,
    ).toBe(false);
    expect(
      opportunitySchema.safeParse({ ...o, url: "javascript:alert(1)" }).success,
    ).toBe(false);
    expect(
      opportunitySchema.safeParse({ ...o, deadline: "2026-12-15T17:00:00" })
        .success,
    ).toBe(false);
  });
});
describe("geographic relationships", () => {
  it("calculates polygon containment and municipality coverage", () => {
    const p = fixtureProjects[0].scopes[0];
    expect(geographicRelationship([-80.515, 43.465], p.geometry)).toBe(
      "Inside the recorded project area",
    );
    expect(
      geographicRelationship(
        [-80.5, 43.46],
        fixtureProjects[2].scopes[0].geometry,
        true,
      ),
    ).toBe("Covered by a municipality-wide policy");
  });
  it("calculates near and far distances without claiming impacts", () => {
    expect(
      geographicRelationship(
        [-80.489, 43.452],
        fixtureProjects[1].scopes[0].geometry,
      ),
    ).toContain("Near");
    expect(
      geographicRelationship([-79, 44], fixtureProjects[1].scopes[0].geometry),
    ).toContain("Outside");
  });
});
