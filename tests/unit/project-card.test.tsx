// @vitest-environment jsdom
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, it, expect } from "vitest";
import { ProjectCard } from "../../src/components/ui/shared";
import { fixtureProjects } from "../../data/fixtures/projects";
afterEach(cleanup);
describe("project cards", () => {
  it("exposes a persistent project-specific URL and accurate status", () => {
    render(<ProjectCard project={fixtureProjects[1]} />);
    expect(
      screen.getByRole("link", { name: "Willow Street complete street" }),
    ).toHaveAttribute("href", "/projects/willow-street");
    expect(screen.getByText("Staff Recommendation")).toBeVisible();
    expect(screen.getByText("Fictional example")).toBeVisible();
  });
});
