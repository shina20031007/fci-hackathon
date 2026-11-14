import { expect, it } from "vitest";
import { fixtureProjects } from "../../data/fixtures/projects";
import { mergeDashboardUpgrade } from "../../src/features/admin/services/refresh-dashboard";
it("restores discarded timeline states idempotently while preserving manual edits", () => {
  const baseline = structuredClone(fixtureProjects[0]);
  baseline.events[0].status = "Not verified";
  const candidate = structuredClone(baseline);
  candidate.events[0].status = "Completed";
  const result = mergeDashboardUpgrade(baseline, baseline, candidate);
  expect(result.events[0].status).toBe("Completed");
  expect(baseline.events[0].status).toBe("Not verified");
  expect(mergeDashboardUpgrade(result, baseline, candidate)).toEqual(result);
  const edited = structuredClone(baseline);
  edited.events[0].description =
    "Staff manually corrected the event description.";
  expect(mergeDashboardUpgrade(edited, baseline, candidate).events[0]).toEqual(
    edited.events[0],
  );
});
