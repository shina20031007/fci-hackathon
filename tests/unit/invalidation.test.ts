import { describe, it, expect } from "vitest";
import { fixtureProjects } from "../../data/fixtures/projects";
import { invalidateChangedReviews } from "../../src/lib/evidence/invalidation";
import { checkStudioRequest } from "../../src/lib/studio-security";
import { vi } from "vitest";
vi.mock("../../src/features/admin/services/auth", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../src/features/admin/services/auth")
  >()),
  currentStaff: vi.fn().mockResolvedValue("test@example.invalid"),
}));
describe("server-side review invalidation", () => {
  it("clears completion confirmation when timeline content changes", () => {
    const previous = structuredClone(fixtureProjects[0]);
    previous.events[0].completionConfirmedOn = "2026-01-01";
    const next = structuredClone(previous);
    next.events[0].description = "A different account of completed work.";
    expect(
      invalidateChangedReviews(previous, next).events[0].completionConfirmedOn,
    ).toBeNull();
  });
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
  it("rejects disabled Studio, external origins and non-loopback hosts", async () => {
    vi.stubEnv("STUDIO_ENABLED", "false");
    const req = new Request("http://127.0.0.1:3000/api/projects", {
      headers: {
        origin: "http://127.0.0.1:3000",
        "content-type": "application/json",
      },
    });
    expect(await checkStudioRequest(req)).toContain("disabled");
    vi.stubEnv("STUDIO_ENABLED", "true");
    expect(await checkStudioRequest(req)).toBeNull();
    expect(
      await checkStudioRequest(
        new Request("http://127.0.0.1:3000/api/projects", {
          headers: {
            origin: "https://external.example",
            "content-type": "application/json",
          },
        }),
      ),
    ).toContain("same-origin");
    expect(
      await checkStudioRequest(
        new Request("https://public.example/api/projects"),
      ),
    ).toContain("disabled");
    vi.unstubAllEnvs();
  });
});
