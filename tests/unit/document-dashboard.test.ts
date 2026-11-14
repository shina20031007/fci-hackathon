import { expect, it } from "vitest";
import { extractionProject } from "../../src/features/admin/services/extraction-project";
import {
  fieldNames,
  groundExtraction,
  type Extraction,
} from "../../src/features/admin/types/extraction";
import { projectAnswer } from "../../src/features/decisions/project-answers";

function draft() {
  const values: Partial<Record<(typeof fieldNames)[number], string>> = {
    title: "Library operating budget",
    category: "Municipal Budget",
    proposal: "Staff recommend opening library branches on Sundays.",
    staffRecommendation: "Staff recommend opening library branches on Sundays.",
    location:
      "All municipal library branches, including branches outside the city centre.",
    residentComments:
      "Consultation participants asked for longer weekend hours.",
  };
  const data: Extraction = {
    fields: fieldNames.map((name) => ({
      name,
      value: values[name] ?? null,
      quote: values[name] ?? null,
      page: values[name] ? 1 : null,
    })),
    events: [],
    warnings: [],
  };
  const pages = [{ page: 1, text: Object.values(values).join("\n") }];
  return { data, pages };
}
it("maps uploaded facts to four cards without treating recommendations as decisions", () => {
  const { data, pages } = draft();
  const project = extractionProject(
    "budget-ai",
    "budget.pdf",
    "https://example.org/budget.pdf",
    data,
    pages,
  );
  expect(projectAnswer(project, "proposal").text.join(" ")).toContain(
    "opening library branches",
  );
  expect(projectAnswer(project, "decision").text.join(" ")).toContain(
    "No adopted decision",
  );
  expect(projectAnswer(project, "decision").text.join(" ")).not.toContain(
    "Staff recommend",
  );
  expect(projectAnswer(project, "scope").text.join(" ")).toContain(
    "outside the city centre",
  );
  expect(projectAnswer(project, "voice").text.join(" ")).toContain(
    "longer weekend hours",
  );
  for (const kind of ["proposal", "scope", "voice"] as const) {
    for (const id of projectAnswer(project, kind).ids)
      expect(project.evidence.find((e) => e.id === id)?.section).toBe("Page 1");
  }
  expect(project.reviewStatus).toBe("Draft");
  expect(
    project.evidence.every((e) => e.state === "Requires Verification"),
  ).toBe(true);
});
it("reads older analyses and hides unsupported residents' comments", () => {
  const { data, pages } = draft();
  data.fields = data.fields.filter((f) => f.name !== "residentComments");
  const project = extractionProject(
    "legacy-ai",
    "legacy.pdf",
    null,
    data,
    pages,
  );
  project.decisions = project.decisions.filter(
    (d) =>
      !["-proposal", "-scope", "-voice"].some((suffix) =>
        d.id.endsWith(suffix),
      ),
  );
  expect(projectAnswer(project, "proposal").text.join(" ")).toContain(
    "opening library branches",
  );
  expect(projectAnswer(project, "voice").text).toEqual([]);
  const current = draft();
  current.data.fields.find((f) => f.name === "residentComments")!.quote =
    "This quotation is not in the PDF.";
  const grounded = groundExtraction(current.data, current.pages);
  expect(
    grounded.fields.find((f) => f.name === "residentComments")!.value,
  ).toBeNull();
});
it("shows an explicitly documented decision with its own citation", () => {
  const { data, pages } = draft();
  const decision = data.fields.find((f) => f.name === "councilDecision")!;
  Object.assign(decision, {
    value: "Council approved the library budget.",
    quote: "Council approved the library budget.",
    page: 1,
  });
  pages[0].text += "\n" + decision.quote;
  const project = extractionProject(
    "decision-ai",
    "budget.pdf",
    null,
    data,
    pages,
  );
  expect(projectAnswer(project, "decision").text.join(" ")).toContain(
    decision.value,
  );
  expect(projectAnswer(project, "decision").ids).toContain(
    "decision-ai-councilDecision",
  );
});

it("preserves multiple full project addresses with independent page citations without inventing map geometry", () => {
  const { data, pages } = draft();
  const first =
    "411 Kennedy Road, 415 Kennedy Road, and the shared 636–646 Danforth Road parcel in Toronto are the subject properties.";
  const second =
    "Additional works run along Example Street between First Avenue and Second Avenue.";
  data.locations = [
    { label: first, kind: "site", page: 2, quote: first },
    { label: second, kind: "corridor", page: 3, quote: second },
    {
      label: "Unsupported address",
      kind: "site",
      page: 4,
      quote: "An address that is not in the supplied document.",
    },
  ];
  pages.push({ page: 2, text: first }, { page: 3, text: second });
  const grounded = groundExtraction(data, pages);
  expect(grounded.locations).toHaveLength(2);
  const project = extractionProject(
    "places-ai",
    "places.pdf",
    null,
    grounded,
    pages,
  );
  const answer = projectAnswer(project, "scope");
  expect(answer.text.join(" ")).toContain(first);
  expect(answer.text.join(" ")).toContain(second);
  expect(answer.text.join(" ")).not.toContain("Unsupported address");
  expect(
    project.evidence.find((e) => e.id === "places-ai-location-0")?.section,
  ).toBe("Page 2");
  expect(
    project.evidence.find((e) => e.id === "places-ai-location-1")?.section,
  ).toBe("Page 3");
  expect(answer.ids).toContain("places-ai-location-0");
  expect(project.scopes).toEqual([]);
});

it("preserves document-reported timeline states while keeping evidence unreviewed", () => {
  const { data, pages } = draft();
  data.events = [
    {
      title: "Council adopted budget",
      description: "Council adopted the budget.",
      date: "2026-02-10",
      status: "Completed",
      type: "Council Decision",
      quote: "Council adopted the budget.",
      page: 1,
    },
  ];
  pages[0].text += "\nCouncil adopted the budget.";
  const project = extractionProject(
    "timeline-ai",
    "budget.pdf",
    null,
    data,
    pages,
  );
  expect(project.events[0].status).toBe("Completed");
  expect(
    project.evidence.find((e) => e.id === project.events[0].evidenceId)
      ?.verifiedAt,
  ).toBeNull();
});
