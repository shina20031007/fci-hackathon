import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async ({ page, baseURL }) => {
  const response = await page.request.post("/api/admin/login", {
    headers: { origin: baseURL! },
    data: {
      email: "staff@example.invalid",
      password: "test-only-password-not-production",
    },
  });
  expect(response.ok()).toBe(true);
});
test("real discovery and fixture evidence, map and private draft workflows", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Your city.*Your perspective/ }),
  ).toBeVisible();
  await page.getByLabel("Search your community").fill("Maryhill");
  await page.getByRole("button", { name: "Search projects" }).click();
  await expect(
    page.getByText("1 decision trail", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Maryhill Road", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/maryhill-road$/);
  // Stored fixtures still exercise rich evidence interactions without appearing in discovery.
  await page.goto("/projects/willow-street");
  await expect(
    page.getByText("Demonstration data — fictional example."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Decisions & evidence", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Project modules" })
    .getByRole("link", { name: "Decision DNA" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Staff Recommendation", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Initial proposal recorded/ }).click();
  await expect(page.locator(".timeline-detail")).toContainText(
    "painted cycle lanes",
  );
  await expect(page.locator(".word-diff ins").first()).toBeVisible();
  await page.getByRole("button", { name: "Inspect project evidence" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Fictional source");
  await expect(dialog.locator(".source-quote")).toContainText(
    "council has not approved",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("navigation", { name: "Project modules" })
    .getByRole("link", { name: "Map & impact" })
    .click();
  await expect(
    page.getByText("Before / after comparison", { exact: true }),
  ).toBeVisible();
  await page
    .getByText("Choose coordinates without using the map", { exact: true })
    .click();
  await page.getByLabel("Longitude", { exact: true }).fill("-80.511");
  await page.getByLabel("Latitude", { exact: true }).fill("43.459");
  await page.getByRole("button", { name: "Check location" }).click();
  await expect(page.getByText(/Selected coordinates:/)).toBeVisible();
  await page
    .getByRole("navigation", { name: "Project modules" })
    .getByRole("link", { name: "Public voice" })
    .click();
  await page.getByLabel("Topic", { exact: true }).selectOption("Accessibility");
  await expect(page.locator(".feedback-card")).toHaveCount(1);
  await expect(page.locator(".feedback-card")).toContainText(
    "Partially Accepted",
  );
  await page
    .getByRole("navigation", { name: "Project modules" })
    .getByRole("link", { name: "How to participate" })
    .click();
  await expect(page).toHaveURL(/willow-street\/participation/);
  await expect(
    page.getByText("No real submissions are available in this fictional case."),
  ).toBeVisible();
  await page
    .getByLabel("My concern", { exact: true })
    .fill("Accessible crossing near the community centre");
  await page
    .getByLabel("My question", { exact: true })
    .fill("Which design condition addresses assisted drop-off?");
  await page.getByRole("button", { name: "Save on this device" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Load saved draft" }).click();
  await expect(page.getByLabel("My question", { exact: true })).toHaveValue(
    "Which design condition addresses assisted drop-off?",
  );
  await page.getByRole("button", { name: "Clear draft" }).click();
});
test("municipal staff save, review, preview and publish persistent changes", async ({
  page,
}) => {
  await page.goto("/studio");
  await page
    .getByRole("link", { name: /Cedar Quarter neighbourhood plan/ })
    .click();
  const summary = page.getByLabel("Proposal summary", { exact: true });
  const old = await summary.inputValue();
  const revised = `${old} The additional approval is still unconfirmed.`;
  await summary.fill(revised);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.reload();
  await expect(
    page.getByLabel("Proposal summary", { exact: true }),
  ).toHaveValue(revised);
  await page.getByRole("link", { name: "Open resident page" }).click();
  await expect(page.locator(".project-summary .lead")).toHaveText(old);
  await page.goto("/studio/cedar-quarter");
  await page.getByRole("tab", { name: "Sources & evidence" }).click();
  await expect(page.getByLabel("Exact supporting passage").first()).toHaveValue(
    /The fictional staff report/,
  );
  await page.getByRole("tab", { name: "Decisions", exact: true }).click();
  const explanation = page.getByLabel("Plain-language explanation");
  const originalExplanation = await explanation.inputValue();
  await explanation.fill(
    `${originalExplanation} Further approval remains necessary.`,
  );
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.getByLabel("Claim review state").selectOption("Verified");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.getByRole("link", { name: "Preview saved draft" }).click();
  await expect(page.getByText("Unpublished draft preview.")).toBeVisible();
  await expect(page.locator(".project-summary .lead")).toHaveText(revised);
  await page.getByRole("link", { name: "Back to draft editor" }).click();
  await page
    .getByLabel("Review note", { exact: true })
    .fill(
      "Checked fictional source passages, additional approval condition, and historical participation dates.",
    );
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByRole("status")).toContainText("Needs Review");
  await page
    .getByRole("button", { name: "Verify demonstration review" })
    .click();
  await expect(page.getByRole("status")).toContainText("Verified");
  await page.getByRole("button", { name: "Publish approved revision" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Published successfully",
  );
  await page.getByRole("link", { name: "Open resident page" }).click();
  await expect(page.locator(".project-summary .lead")).toHaveText(revised);
  await page.reload();
  await expect(page.locator(".project-summary .lead")).toHaveText(revised);
});
test("search filters, create project and blocked publication", async ({
  page,
}) => {
  await page.goto("/explore");
  await page
    .getByLabel("Category", { exact: true })
    .selectOption("Transportation");
  await expect(page.locator(".project-card")).toHaveCount(1);
  await page
    .getByLabel("Decision status", { exact: true })
    .selectOption("Council Decision");
  await expect(
    page.getByRole("heading", { name: "No matching decisions" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".project-card")).toHaveCount(3);
  await page.goto("/studio");
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await page
    .getByLabel("Project title", { exact: true })
    .fill("New fictional pilot draft");
  await page
    .getByLabel("Municipality", { exact: true })
    .fill("Example Town (fictional)");
  await page.getByRole("button", { name: "Create draft", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "New fictional pilot draft",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publish approved revision" }),
  ).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel("Project title", { exact: true })).toHaveValue(
    "New fictional pilot draft",
  );
});
test("keyboard, evidence focus and mobile navigation remain accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page
    .getByRole("button", { name: "Explore decisions", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "All projects", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Menu", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".project-card")).toHaveCount(3);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("/projects/willow-street/decisions");
  await page.getByRole("button", { name: "Inspect project evidence" }).click();
  await expect(
    page.getByRole("button", { name: "Close evidence" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Inspect project evidence" }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("core pages have no serious or critical automated accessibility violations", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/explore",
    "/projects/willow-street/decisions",
    "/projects/willow-street/participation",
    "/studio",
  ]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      ),
      `${path}: ${JSON.stringify(results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target) })))}`,
    ).toEqual([]);
  }
});

test("map selection, layer controls and a printable brief work", async ({
  page,
}) => {
  await page.goto("/explore");
  await expect(page.locator("arcgis-map")).toBeVisible({ timeout: 60000 });
  await page
    .locator(".map-project-list")
    .getByRole("button", { name: "Maryhill Road", exact: true })
    .click();
  await expect(page.locator(".map-wrap .map-selection")).toContainText(
    "Maryhill Road",
  );
  await expect(page.locator(".project-card.selected")).toHaveCount(1);
  await page.getByLabel("Municipality boundary", { exact: true }).uncheck();
  await expect(
    page.getByLabel("Municipality boundary", { exact: true }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Reset Waterloo extent" }).click();
  await page.goto("/projects/cedar-quarter");
  await page.emulateMedia({ media: "print" });
  await expect(
    page.getByRole("heading", { name: "Supporting sources", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".civic-header")).not.toBeVisible();
});

test("tablet and mobile modules fit without horizontal overflow", async ({
  page,
}) => {
  for (const width of [768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/",
      "/projects/willow-street/public-voice",
      "/projects/willow-street/impact",
      "/projects/willow-street/participation",
      "/studio/cedar-quarter",
    ]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `${route} at ${width}px`,
      ).toBe(true);
    }
  }
});
