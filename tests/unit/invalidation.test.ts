import { describe, it, expect } from "vitest";
import { fixtureProjects } from "../../data/fixtures/projects";
import { invalidateChangedReviews } from "../../src/lib/evidence/invalidation";
import { checkStudioRequest } from "../../src/lib/studio-security";
import { vi } from "vitest";
describe("server-side review invalidation", () => {
  it("requires a separate review after a verified claim is edited", () => {
    const previous = fixtureProjects[0],
      next = structuredClone(previous);
    next.decisions[0].explanation = "A materially different explanation.";
    expect(
      invalidateChangedReviews(previous, next).decisions[0].reviewState,
    ).toBe("Needs Verification");
  });
  it("invalidates linked evidence and claims when their source changes", () => {
    const previous = fixtureProjects[0],
      next = structuredClone(previous);
    next.sources[2].date = "2026-10-23";
    const result = invalidateChangedReviews(previous, next);
    expect(result.evidence[2].verifiedAt).toBeNull();
    expect(result.decisions[0].reviewState).toBe("Needs Verification");
  });
  it("invalidates participation confirmation when its deadline changes", () => {
    const previous = fixtureProjects[1],
      next = structuredClone(previous);
    next.opportunities[0].deadline = "2026-12-16T17:00:00-05:00";
    expect(
      invalidateChangedReviews(previous, next).opportunities[0].confirmed,
    ).toBe(false);
  });
  it("allows explicit verification after the edited content is saved", () => {
    const previous = structuredClone(fixtureProjects[0]);
    previous.decisions[0].reviewState = "Needs Verification";
    const next = structuredClone(previous);
    next.decisions[0].reviewState = "Verified";
    expect(
      invalidateChangedReviews(previous, next).decisions[0].reviewState,
    ).toBe("Verified");
  });
});
describe("local write guards", () => {
  it("rejects disabled Studio, external origins and non-loopback hosts", () => {
    vi.stubEnv("STUDIO_ENABLED", "false");
    const req = new Request("http://127.0.0.1:3000/api/projects", {
      headers: {
        origin: "http://127.0.0.1:3000",
        "content-type": "application/json",
      },
    });
    expect(checkStudioRequest(req)).toContain("disabled");
    vi.stubEnv("STUDIO_ENABLED", "true");
    expect(checkStudioRequest(req)).toBeNull();
    expect(
      checkStudioRequest(
        new Request("http://127.0.0.1:3000/api/projects", {
          headers: {
            origin: "https://external.example",
            "content-type": "application/json",
          },
        }),
      ),
    ).toContain("same-origin");
    expect(
      checkStudioRequest(new Request("https://public.example/api/projects")),
    ).toContain("loopback");
    vi.unstubAllEnvs();
  });
});
