// @vitest-environment jsdom
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, it, expect } from "vitest";
import { DecisionTimeline } from "../../src/components/ui/decision-timeline";
import { CorridorProgress } from "../../src/features/rapidto/corridor-progress";
import {
  EvidenceProvider,
  evidenceSourceUrl,
} from "../../src/components/evidence/evidence-provider";
import { fixtureProjects } from "../../data/fixtures/projects";
afterEach(cleanup);
function corridor(verified: boolean, date = "") {
  const p = structuredClone(fixtureProjects[0]);
  p.synthetic = false;
  p.events = [{ ...p.events[0], date, status: "Completed" }];
  const evidence = p.evidence.find((e) => e.id === p.events[0].evidenceId)!;
  evidence.state = verified ? "Officially Confirmed" : "Requires Verification";
  evidence.verifiedAt = verified ? "2026-11-13T12:00:00Z" : null;
  return p;
}
it("does not present an unreviewed installation claim as verified", () => {
  render(<DecisionTimeline project={corridor(false)} allowUndatedCompleted />);
  expect(screen.queryByText("Verified Completed")).not.toBeInTheDocument();
});
it("can show verified completion without inventing an exact installation day", () => {
  render(<DecisionTimeline project={corridor(true)} allowUndatedCompleted />);
  expect(screen.getByText("Verified Completed")).toBeVisible();
  expect(screen.getByText("Date not confirmed")).toBeVisible();
});
it("does not turn a future dated event into completed work", () => {
  render(
    <DecisionTimeline
      project={corridor(true, "2999-01-01")}
      allowUndatedCompleted
    />,
  );
  expect(screen.queryByText("Verified Completed")).not.toBeInTheDocument();
});
it("preserves the existing date requirement outside the corridor presentation", () => {
  render(<DecisionTimeline project={corridor(true)} />);
  expect(screen.queryByText("Verified Completed")).not.toBeInTheDocument();
});

import {
  periodLabel,
  stageState,
} from "../../src/features/rapidto/corridor-progress";
it("keeps unreviewed stages out of the public completed state", () => {
  const p = corridor(false);
  expect(stageState(p, p.events[0], false)).toBe("pending");
  expect(stageState(p, p.events[0], true)).toBe("draftDone");
});
it("does not infer missing stages or a date from prose", () => {
  expect(periodLabel("May 2026. Installation is complete.")).toBe("May 2026");
  expect(periodLabel("Fall 2024. Consultation ended.")).toBe("Fall 2024");
  expect(periodLabel("The next meeting might be in May 2026.")).toBeUndefined();
  const p = corridor(true, "2999-01-01");
  expect(stageState(p, p.events[0], true)).toBe("pending");
});

it("keeps a Housing council consideration distinct from approval and uses its recorded next step", () => {
  const p = corridor(true, "2999-01-01");
  p.category = "Housing";
  p.events[0].title = "Council decision";
  p.events[0].status = "Planned";
  p.decisions = [
    {
      ...p.decisions[0],
      id: p.id + "-next",
      explanation: "Council consideration date has not been announced.",
    },
  ];
  render(
    <EvidenceProvider project={p}>
      <CorridorProgress project={p} variant="project" />
    </EvidenceProvider>,
  );
  expect(screen.queryByText("Council approval")).not.toBeInTheDocument();
  expect(screen.getAllByText("Council decision").length).toBeGreaterThan(0);
  expect(
    screen.getAllByText("Council consideration date has not been announced.")
      .length,
  ).toBeGreaterThan(0);
  expect(screen.queryByText("Toronto · RapidTO")).not.toBeInTheDocument();
  expect(screen.queryByText("You are here")).not.toBeInTheDocument();
});

it("links a PDF citation to its recorded page without inventing pages for web sources", () => {
  expect(
    evidenceSourceUrl(
      "https://www.toronto.ca/bulletin.pdf",
      "Page 2 — Contacts",
    ),
  ).toBe("https://www.toronto.ca/bulletin.pdf#page=2");
  expect(
    evidenceSourceUrl("https://secure.toronto.ca/notice/8007.do", "PROPOSAL"),
  ).toBe("https://secure.toronto.ca/notice/8007.do");
});
