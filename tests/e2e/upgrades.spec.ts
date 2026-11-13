import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("languages persist, preserve drafts and leave official excerpts unchanged", async ({
  page,
}) => {
  await page.goto("/projects/wilmot-official-plan/decisions");
  await page.getByRole("button", { name: "Inspect project evidence" }).click();
  const quote = await page.locator(".source-quote").innerText();
  await page.keyboard.press("Escape");
  await page.getByLabel("Language", { exact: true }).selectOption("zh-CN");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page).toHaveURL(/wilmot-official-plan\/decisions$/);
  await expect(page.locator(".decision-explanation")).toContainText("通过");
  await page.locator(".decision-summary .evidence-button").click();
  await expect(page.locator(".source-quote")).toHaveText(quote);
  await page.keyboard.press("Escape");
  await page.goto("/projects/wilmot-official-plan/participation");
  await page.locator("textarea").first().fill("My unsaved question");
  await page.locator(".language-selector select").selectOption("fr");
  await expect(page.locator("textarea").first()).toHaveValue(
    "My unsaved question",
  );
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await page.reload();
  await expect(page.locator(".language-selector select")).toHaveValue("fr");
  await expect(page.locator(".translation-notice")).toContainText("Traduction");
});
test("all six modules present translated controls and keep filter values canonical", async ({
  page,
}) => {
  await page.goto("/explore");
  await page
    .getByLabel("Category", { exact: true })
    .selectOption("Transportation");
  await page.getByLabel("Language", { exact: true }).selectOption("fr");
  await expect(page.locator("#category")).toHaveValue("Transportation");
  await expect(page.locator(".project-card")).toHaveCount(1);
  await expect(page.locator("h1")).not.toContainText("Find the decisions");
  await page.goto("/");
  await expect(page.locator("h1")).not.toContainText(
    "Understand the decisions",
  );
  await page.goto("/projects/wilmot-official-plan");
  await expect(page.locator(".project-tabs")).toContainText("Aperçu du projet");
  await expect(page.locator(".project-summary h2")).not.toContainText(
    "What is being considered?",
  );
  for (const path of [
    "/projects/wilmot-official-plan/decisions",
    "/projects/wilmot-official-plan/public-voice",
    "/projects/wilmot-official-plan/impact",
    "/projects/wilmot-official-plan/participation",
    "/studio",
  ]) {
    await page.goto(path);
    await expect(page.locator(".language-selector select")).toHaveValue("fr");
    await expect(page.locator("main")).not.toContainText(
      "Conditions that still matter",
    );
    await expect(page.locator("main")).not.toContainText(
      "Organize your questions.",
    );
    await expect(page.locator("main")).not.toContainText(
      "Relevance has limits.",
    );
    await expect(page.locator("main")).not.toContainText(
      "Clear information starts with careful review.",
    );
  }
});
test("real cases stay separate, historical consultation is closed without an invented time", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".project-card")).toHaveCount(3);
  await expect(page.locator(".project-grid")).not.toContainText(
    "Fictional example",
  );
  await page.goto("/projects/maryhill-road/participation");
  await expect(page.locator(".opportunity-card")).toContainText("Closed");
  await expect(page.locator(".opportunity-card")).toContainText("Jun 10, 2026");
  await expect(page.locator(".opportunity-card")).not.toContainText("11:59");
  await page.goto("/explore");
  await page
    .getByLabel("Show fictional test cases instead of real projects")
    .check();
  await expect(page.locator(".project-card")).toHaveCount(3);
  await expect(page.locator(".project-card").first()).toContainText(
    "Fictional example",
  );
});
test("ArcGIS loads, regional address search works, locale preserves the map view", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/projects/wilmot-official-plan/impact");
  await expect(page.locator("arcgis-map")).toBeVisible({ timeout: 60000 });
  await expect(page.locator("arcgis-map canvas").first()).toBeVisible({
    timeout: 60000,
  });
  const search = page.locator("arcgis-search input").first();
  await search.fill("150 Frederick");
  await search.press("Enter");
  await expect(page.getByText(/Selected coordinates:/)).toBeVisible({
    timeout: 30000,
  });
  const before = await page.locator("arcgis-map").evaluate((node) => {
    const map = node as HTMLElement & {
      view: { center: { x: number; y: number }; scale: number };
    };
    return {
      x: map.view.center.x,
      y: map.view.center.y,
      scale: map.view.scale,
    };
  });
  await page.getByLabel("Language", { exact: true }).selectOption("zh-CN");
  const after = await page.locator("arcgis-map").evaluate((node) => {
    const map = node as HTMLElement & {
      view: { center: { x: number; y: number }; scale: number };
    };
    return {
      x: map.view.center.x,
      y: map.view.center.y,
      scale: map.view.scale,
    };
  });
  expect(after).toEqual(before);
  await expect(
    page.locator('select[aria-label="底图"] option[value="imagery"]'),
  ).toBeDisabled();
});
test("translated mobile pages and enlarged text retain accessible controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("fr");
  for (const path of [
    "/",
    "/projects/wilmot-official-plan/public-voice",
    "/projects/maryhill-road/participation",
  ]) {
    await page.goto(path);
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      path,
    ).toBe(true);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      result.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      ),
    ).toEqual([]);
  }
});
