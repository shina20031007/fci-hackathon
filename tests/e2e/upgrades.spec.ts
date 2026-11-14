import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { ArcgisMap } from "@arcgis/map-components/components/arcgis-map/customElement";
import type { ArcgisSearch } from "@arcgis/map-components/components/arcgis-search/customElement";
// Traces contain service request tokens when a local browser key is configured.
test.use({ trace: "off" });
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
  await expect(page.locator(".translation-notice")).toHaveCount(0);
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
  await expect(page.locator(".project-card")).toHaveCount(6);
  await expect(page.locator("h1")).not.toContainText("Find the decisions");
  await page.goto("/");
  await expect(page.locator("h1")).not.toContainText(
    "Understand the decisions",
  );
  await page.goto("/projects/wilmot-official-plan");
  await expect(page.locator(".civic-project-nav")).toContainText(
    "Aperçu du projet",
  );
  await expect(page.locator(".project-summary h2")).not.toContainText(
    "What is being considered?",
  );
  for (const path of [
    "/projects/wilmot-official-plan/decisions",
    "/projects/wilmot-official-plan/public-voice",
    "/projects/wilmot-official-plan/impact",
    "/projects/wilmot-official-plan/participation",
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
  await expect(page.locator("a[data-category]")).toHaveCount(7);
  await expect(page.locator(".project-card, .workflow-grid")).toHaveCount(0);
  await page.goto("/projects/maryhill-road/participation");
  await expect(page.locator(".opportunity-card")).toContainText("Closed");
  await expect(page.locator(".opportunity-card")).toContainText("Jun 10, 2026");
  await expect(page.locator(".opportunity-card")).not.toContainText("11:59");
  await page.goto("/explore");
  await expect(
    page.getByLabel("Show fictional test cases instead of real projects"),
  ).toHaveCount(0);
  await expect(page.locator("#municipality")).not.toContainText("fictional");
  await expect(page.locator(".project-card")).toHaveCount(10);
  await expect(page.locator(".demo-banner, .translation-notice")).toHaveCount(
    0,
  );
  await expect(
    page.getByText(/Address search uses licensed Waterloo Region/),
  ).toHaveCount(0);
  await expect(
    page.getByText(/Satellite imagery, light gray and Canada-wide/),
  ).toHaveCount(0);
  const sizes = await page
    .locator(".discovery-filters > select")
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return { width: box.width, height: box.height };
      }),
    );
  expect(sizes).toHaveLength(4);
  expect(
    Math.max(...sizes.map((s) => s.width)) -
      Math.min(...sizes.map((s) => s.width)),
  ).toBeLessThan(1);
  expect(sizes.every((s) => s.height >= 44 && s.height <= 48)).toBe(true);
  await page.getByRole("textbox", { name: "Search decisions" }).fill("Willow");
  await expect(page.locator(".project-card")).toHaveCount(0);
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
  ).toHaveCount(1);
});
test("translated mobile pages and enlarged text retain accessible controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
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

test("integrated navigation opens live routes, sources and browser history", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".civic-project-nav")).toHaveCount(0);
  const trigger = page.getByRole("button", {
    name: "Explore decisions",
    exact: true,
  });
  await trigger.focus();
  await trigger.press("ArrowDown");
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "All projects", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page
    .getByRole("heading", { level: 1 })
    .click({ position: { x: 5, y: 5 } });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await page
    .getByRole("link", { name: "Find by category", exact: true })
    .click();
  await expect(page).toHaveURL(/\/explore#category$/);
  await page
    .getByLabel("Category", { exact: true })
    .selectOption("Transportation");
  await expect(page.locator(".project-card")).toHaveCount(6);
  await page
    .locator(".project-card")
    .getByRole("link", { name: "Maryhill Road", exact: true })
    .click();
  await expect(page).toHaveURL(/\/projects\/maryhill-road$/);
  const nav = page.getByRole("navigation", { name: "Project modules" });
  await nav
    .getByRole("button", { name: "Decisions & evidence", exact: true })
    .click();
  await nav
    .getByRole("link", { name: "Documents, amendments & sources" })
    .click();
  await expect(page).toHaveURL(/maryhill-road#project-sources$/);
  await expect(page.locator("#project-sources")).toBeVisible();
  await page
    .locator("#project-sources")
    .getByRole("link", { name: "Compare the recorded versions" })
    .click();
  await expect(page).toHaveURL(/maryhill-road\/decisions#recorded-versions$/);
  await expect(page.locator("#recorded-versions")).toBeVisible();
  for (const [label, module] of [
    ["Map & impact", "impact"],
    ["Public voice", "public-voice"],
    ["How to participate", "participation"],
  ]) {
    await nav.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/maryhill-road/${module}$`));
    await expect(page.locator("h1")).toHaveText("Maryhill Road");
  }
  await page.reload();
  await expect(
    nav.getByRole("link", { name: "How to participate", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.goBack();
  await expect(page).toHaveURL(/maryhill-road\/public-voice$/);
  await page
    .getByRole("navigation", { name: "Breadcrumb" })
    .getByRole("link", { name: "All projects" })
    .click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.locator(".project-card")).toHaveCount(10);
  await page.getByRole("link", { name: "Staff Portal", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("link", { name: "Import Documents", exact: true }),
  ).toHaveAttribute("href", "/admin?tab=imports");
});

test("integrated 390px menus preserve project and locale", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
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
  ).toHaveAttribute("aria-expanded", "false");
  await page
    .locator(".project-card")
    .getByRole("link", { name: "Maryhill Road", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Project navigation: Project overview",
      exact: true,
    })
    .click();
  await page
    .getByRole("navigation", { name: "Project modules" })
    .getByRole("link", { name: "Public voice", exact: true })
    .click();
  await expect(page).toHaveURL(/maryhill-road\/public-voice$/);
  await expect(page.locator(".civic-project-toggle")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.getByLabel("Language", { exact: true }).selectOption("zh-CN");
  await expect(page.locator("h1")).toHaveText("Maryhill Road");
  await expect(page).toHaveURL(/maryhill-road\/public-voice$/);
  await page.getByRole("button", { name: "关闭菜单", exact: true }).click();
  await page.locator(".civic-project-toggle").click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".civic-project-toggle")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(page.locator(".civic-project-toggle")).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "菜单", exact: true }).click();
  await expect(page.locator(".language-selector select")).toHaveValue("zh-CN");
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
});

test("configured ArcGIS basemaps and Canada search preserve project geography", async ({
  page,
}) => {
  test.setTimeout(120000);
  let hydrationErrors = 0;
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydration|hydrated|server rendered HTML/i.test(message.text())
    )
      hydrationErrors++;
  });
  let uncaughtErrors = 0;
  page.on("pageerror", () => uncaughtErrors++);
  await page.goto("/explore");
  test.skip(
    await page.locator('option[value="imagery"]').isDisabled(),
    "Requires a local ArcGIS browser key",
  );
  const map = page.locator("arcgis-map");
  await expect(map.locator("canvas").first()).toBeVisible({ timeout: 60000 });
  const count = () =>
    map.evaluate((node) =>
      (node as ArcgisMap).map?.layers.find(
        (layer) => layer.title === "Project geography",
      )?.type === "graphics"
        ? (
            (node as ArcgisMap).map!.layers.find(
              (layer) => layer.title === "Project geography",
            ) as import("@arcgis/core/layers/GraphicsLayer.js").default
          ).graphics.length
        : 0,
    );
  const original = await count();
  expect(original).toBeGreaterThan(0);
  const retiredLayer = await map.evaluateHandle((node) =>
    (node as ArcgisMap).map!.basemap!.baseLayers.getItemAt(0),
  );
  for (const [value, id] of [
    ["imagery", "arcgis/imagery"],
    ["gray", "arcgis/light-gray"],
    ["roads", "arcgis/streets"],
  ]) {
    await page.getByLabel("Basemap", { exact: true }).selectOption(value);
    await expect
      .poll(
        () =>
          map.evaluate((node) => (node as ArcgisMap).map?.basemap?.style?.id),
        { timeout: 30000 },
      )
      .toBe(id);
    await expect
      .poll(() =>
        map.evaluate((node) => (node as ArcgisMap).map?.basemap?.loadStatus),
      )
      .toBe("loaded");
    expect(await count()).toBe(original);
  }
  await map.evaluate((node, layer) => {
    node.dispatchEvent(
      new CustomEvent("arcgisViewLayerviewCreateError", {
        detail: {
          layer,
          error: new Error("Late failure from a replaced basemap"),
        },
      }),
    );
  }, retiredLayer);
  await retiredLayer.dispose();
  await expect(page.locator(".map-notice")).toHaveCount(0);
  const search = page.locator("arcgis-search input").first();
  await search.fill("111 Wellington Street, Ottawa, ON");
  await search.press("Enter");
  await expect(page.getByText(/Selected coordinates:/)).toBeVisible({
    timeout: 30000,
  });
  await expect
    .poll(
      () =>
        map.evaluate((node) => {
          const point = (node as ArcgisMap).view?.center;
          return (
            !!point &&
            Math.abs(point.longitude! + 75.7) < 0.1 &&
            Math.abs(point.latitude! - 45.42) < 0.1
          );
        }),
      { timeout: 30000 },
    )
    .toBe(true);
  await page.getByRole("button", { name: "Reset Waterloo extent" }).click();
  await page.goto("/projects/maryhill-road");
  await expect(page.locator("h1")).toHaveText("Maryhill Road");
  await page.goto("/projects/maryhill-road/impact");
  await expect(page.locator("arcgis-map canvas").first()).toBeVisible({
    timeout: 60000,
  });
  await expect
    .poll(
      () =>
        page
          .locator("arcgis-map")
          .evaluate((node) => (node as ArcgisMap).map?.basemap?.style?.id),
      { timeout: 30000 },
    )
    .toBe("arcgis/streets");
  await page
    .getByText("Choose coordinates without using the map", { exact: true })
    .click();
  await page.getByLabel("Longitude", { exact: true }).fill("-80.5");
  await page.getByLabel("Latitude", { exact: true }).fill("43.46");
  await page.getByRole("button", { name: "Check location" }).click();
  await expect(page.getByText(/Selected coordinates:/)).toBeVisible();
  expect(hydrationErrors).toBe(0);
  expect(uncaughtErrors).toBe(0);
});

test("ArcGIS denied services retain fallback map, regional search and coordinates", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/projects/wilmot-official-plan/impact");
  test.skip(
    await page.locator('option[value="imagery"]').isDisabled(),
    "Requires a configured key to exercise denial handling",
  );
  await expect(page.locator("arcgis-map canvas").first()).toBeVisible({
    timeout: 60000,
  });
  await expect
    .poll(
      () =>
        page
          .locator("arcgis-map")
          .evaluate((node) => (node as ArcgisMap).map?.basemap?.style?.id),
      { timeout: 30000 },
    )
    .toBe("arcgis/streets");
  await page.route("https://basemapstyles-api.arcgis.com/**", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: 403, message: "Access denied" } }),
    }),
  );
  await page.getByLabel("Basemap", { exact: true }).selectOption("gray");
  await expect(page.getByText(/Showing OpenStreetMap/)).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByLabel("Basemap", { exact: true })).toHaveValue(
    "roads",
  );
  await expect
    .poll(() =>
      page
        .locator("arcgis-map")
        .evaluate((node) => (node as ArcgisMap).map?.basemap?.title),
    )
    .toBe("OpenStreetMap");
  await page.route("https://geocode-api.arcgis.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: 498, message: "Invalid token" } }),
    }),
  );
  const input = page.locator("arcgis-search input").first();
  await input.fill("111 Wellington Street, Ottawa, ON");
  await input.press("Enter");
  await expect(
    page.getByText(/Waterloo Region search is available/),
  ).toBeVisible({ timeout: 30000 });
  await expect
    .poll(() =>
      page
        .locator("arcgis-search")
        .evaluate((node) => (node as ArcgisSearch).activeSource?.name),
    )
    .toBe("Waterloo Region addresses");
  await input.fill("150 Frederick");
  await input.press("Enter");
  await expect(page.getByText(/Selected coordinates:/)).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByLabel("Geographic text alternative")).toBeAttached();
});

test("ArcGIS missing key keeps regional search and coordinate input", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/explore");
  test.skip(
    !(await page.locator('option[value="imagery"]').isDisabled()),
    "Run with an empty NEXT_PUBLIC_ARCGIS_API_KEY",
  );
  await expect(page.locator('option[value="gray"]')).toBeDisabled();
  await expect(page.locator("arcgis-map canvas").first()).toBeVisible({
    timeout: 60000,
  });
  await expect
    .poll(() =>
      page
        .locator("arcgis-search")
        .evaluate((node) => (node as ArcgisSearch).activeSource?.name),
    )
    .toBe("Waterloo Region addresses");
  const input = page.locator("arcgis-search input").first();
  await input.fill("150 Frederick");
  await input.press("Enter");
  await expect(page.getByText(/Selected coordinates:/)).toBeVisible({
    timeout: 30000,
  });
  await page
    .getByText("Choose coordinates without using the map", { exact: true })
    .click();
  await page.getByLabel("Longitude", { exact: true }).fill("-80.5");
  await page.getByLabel("Latitude", { exact: true }).fill("43.46");
  await page.getByRole("button", { name: "Check location" }).click();
  await expect(page.getByText(/Selected coordinates:/)).toBeVisible();
  await expect(page.getByLabel("Geographic text alternative")).toBeAttached();
});

test("cityora homepage search and all seven category links reuse Explore filters", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle("cityora. — Your city. Your perspective.");
  await expect(page.locator("h1")).toHaveText("Your city.Your perspective.");
  await expect(
    page.locator("main .project-card, main .workflow-grid"),
  ).toHaveCount(0);
  await page
    .getByRole("searchbox", { name: "Search your community" })
    .fill("Maryhill");
  await page
    .getByRole("searchbox", { name: "Search your community" })
    .press("Enter");
  await expect(page).toHaveURL(/explore\?q=Maryhill/);
  await expect(
    page.getByRole("textbox", { name: "Search decisions" }),
  ).toHaveValue("Maryhill");
  await expect(page.locator(".project-card")).toHaveCount(1);
  const categories = [
    "Transportation",
    "Housing",
    "Land Use and Zoning",
    "Infrastructure",
    "Environment",
    "Municipal Budget",
    "Public Services",
  ];
  const expectedCounts: Record<string, number> = {
    Transportation: 6,
    Housing: 2,
    "Land Use and Zoning": 1,
    Infrastructure: 0,
    Environment: 0,
    "Municipal Budget": 1,
    "Public Services": 0,
  };
  for (const category of categories) {
    await page.goto("/");
    await page.locator(`a[data-category="${category}"]`).click();
    await expect(page.locator("#category")).toHaveValue(category);
    await expect(page.locator(".project-card")).toHaveCount(
      expectedCounts[category] ?? 0,
    );
  }
  await page.goto("/explore?category=invalid");
  await expect(page.locator("#category")).toHaveValue("");
  expect(errors).toEqual([]);
});

test("cityora subscription stays unavailable, validates locally and clears email on close", async ({
  page,
}) => {
  const transmitted: string[] = [];
  page.on("request", (request) => {
    if (
      (request.postData() ?? "").includes("resident@example.com") ||
      request.url().includes("resident%40example.com")
    )
      transmitted.push(request.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Subscribe", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(
    "Email subscriptions are not available yet.",
  );
  const email = dialog.getByLabel("Email address", { exact: true });
  await email.fill("invalid");
  await email.press("Tab");
  await expect(dialog.getByRole("alert")).toHaveText(
    "Enter a valid email address.",
  );
  await email.fill("resident@example.com");
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Subscription unavailable" }),
  ).toBeDisabled();
  await email.press("Enter");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Subscribe", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Subscribe", exact: true }).click();
  await expect(email).toHaveValue("");
  await dialog
    .getByRole("button", { name: "Close subscription dialog" })
    .click();
  expect(transmitted).toEqual([]);
  expect(
    await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    ),
  ).not.toContain("resident@example.com");
});

test("cityora mobile photos, languages and subscription remain accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const [locale, title] of [
    ["en", "Your city."],
    ["fr", "Votre ville."],
    ["zh-CN", "你的城市。"],
  ]) {
    await page
      .getByRole("button", {
        name: /^(Menu|菜单|Menu principal)$/,
        exact: true,
      })
      .click();
    await page.locator(".language-selector select").selectOption(locale);
    await page.locator(".civic-mobile-toggle").click();
    await expect(page.locator("h1")).toContainText(title);
    await expect(page.locator(".civic-brand")).toHaveText("cityora.");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const accessibility = await new AxeBuilder({ page })
      .include("main")
      .analyze();
    expect(accessibility.violations).toEqual([]);
  }
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  const images = page.locator("main img");
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate(
          (element: HTMLImageElement) =>
            element.complete && element.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
  await page.locator(".civic-mobile-toggle").click();
  await page.getByRole("button", { name: "订阅", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("邮件订阅暂未开放。");
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});
