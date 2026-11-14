import { expect, it } from "vitest";
import { fixtureProjects } from "../../data/fixtures/projects";
import { searchProjects } from "../../src/lib/search/projects";
import { filterProjects } from "../../src/lib/evidence/policy";

function projects() {
  return [
    ["bathurst", "Bathurst Street", "511", "Streetcar priority lanes"],
    ["dufferin", "Dufferin Street", "29", "Bus priority lanes"],
    ["housing", "New housing", "", "Homes and zoning"],
  ].map(([id, title, route, summary]) => {
    const p = structuredClone(fixtureProjects[0]);
    p.id = id;
    p.title = title;
    p.municipality = "Toronto";
    p.neighbourhood = title;
    p.summary = summary;
    p.rationale = summary;
    p.category = id === "housing" ? "Housing" : "Transportation";
    p.decisions = [];
    p.sources = [];
    p.events = [];
    p.feedback = [];
    p.scopes = route
      ? [
          {
            ...p.scopes[0],
            label: `TTC ${route} ${title}`,
            description: summary,
          },
        ]
      : [];
    return p;
  });
}
it("finds partial names and handles one typo or adjacent transposition", () => {
  for (const q of ["BATH", "bathrust", "bathurt", "bathurxt"])
    expect(searchProjects(projects(), q)[0]?.id).toBe("bathurst");
  expect(searchProjects(projects(), "duferin")[0]?.id).toBe("dufferin");
});
it("ranks multiple keywords ahead of projects matching only the city", () => {
  const input = projects().reverse();
  expect(searchProjects(input, "Toronto streetcar Bathurst")[0].id).toBe(
    "bathurst",
  );
  expect(searchProjects(input, "please show me Dufferin bus")[0].id).toBe(
    "dufferin",
  );
});
it("matches route numbers exactly and never silently corrects a route", () => {
  expect(searchProjects(projects(), "511 bus").map((p) => p.id)).toEqual([
    "bathurst",
  ]);
  for (const q of ["51", "512", "999 bus"])
    expect(searchProjects(projects(), q)).toEqual([]);
});
it("supports Chinese themes, French aliases and accent-insensitive text", () => {
  expect(searchProjects(projects(), "多伦多公交")[0].id).toBe("dufferin");
  expect(searchProjects(projects(), "巴瑟斯特")[0].id).toBe("bathurst");
  for (const q of ["住房", "logements", "logément"])
    expect(searchProjects(projects(), q)[0]?.id).toBe("housing");
  const input = projects();
  input[0].title = "Eglinton Avenue East";
  expect(searchProjects(input, "ÉGLINTON")[0]?.id).toBe("bathurst");
});
it("retains category filters, empty-query order and genuine no-result states", () => {
  const input = projects();
  expect(searchProjects(input, "  ")).toEqual(input);
  expect(searchProjects(input, "volcano")).toEqual([]);
  expect(
    filterProjects(input, { query: "Toronto", category: "Housing" }).map(
      (p) => p.id,
    ),
  ).toEqual(["housing"]);
  expect(searchProjects(input.slice(1), "511")).toEqual([]);
});
