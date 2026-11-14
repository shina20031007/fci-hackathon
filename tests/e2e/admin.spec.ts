import { test, expect } from "@playwright/test";
import { fixtureProjects } from "../../data/fixtures/projects";

test("unauthenticated visitors cannot read drafts, files or mutate admin records", async ({
  page,
  baseURL,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/studio/cedar-quarter");
  await expect(page).toHaveURL(/\/admin\/login$/);
  for (const path of [
    "/api/admin/lifecycle",
    "/api/admin/documents",
    "/api/admin/official",
    "/api/admin/projects/cedar-quarter/review",
    "/api/admin/documents/missing/analyze",
    "/api/admin/documents/missing/review",
  ]) {
    const response = await page.request.post(path, {
      headers: { origin: baseURL! },
      data: {},
    });
    expect(response.ok()).toBe(false);
    expect(await response.text()).toContain("Staff sign-in required");
  }
  expect(
    (await page.request.get("/api/admin/documents/missing/file")).status(),
  ).toBe(401);
});

test("English staff login, review persistence, edit invalidation and safe structured upload", async ({
  page,
}) => {
  await page.goto("/admin/login");
  await page.evaluate(() => localStorage.setItem("civictrace:locale", "zh-CN"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByLabel("Email", { exact: true }).fill("staff@example.invalid");
  await page
    .getByLabel("Password", { exact: true })
    .fill("test-only-password-not-production");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto(
    "/admin?project=cedar-quarter&section=Review%20%26%20Verification",
  );
  await expect(
    page.getByRole("heading", { name: "Review & Verify", exact: true }),
  ).toBeVisible();
  const title = page
    .locator("section.panel")
    .filter({ has: page.getByRole("heading", { name: "title", exact: true }) });
  await title.getByRole("button", { name: "Verify", exact: true }).click();
  await expect(title).toContainText("Verified by");
  await page.reload();
  await expect(title).toContainText("Verified by");
  await title
    .getByLabel("Edit title")
    .fill("Cedar Quarter reviewed test title");
  await title.getByRole("button", { name: "Save edited field" }).click();
  await expect(title).toContainText("Not verified");
  await title.getByLabel("Edit title").fill("Cedar Quarter neighbourhood plan");
  await title.getByRole("button", { name: "Save edited field" }).click();
  await expect(title.getByLabel("Edit title")).toHaveValue(
    "Cedar Quarter neighbourhood plan",
  );
  await page.goto("/admin?tab=imports");
  await page.getByLabel("Document (maximum 3 MB)").setInputFiles({
    name: "votes.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "Agenda Item #,Motion Type,Vote,Result\n2024.EX11.8,Amend Item,Yes,Carried",
    ),
  });
  await page.getByLabel("Structured dataset type").selectOption("votes");
  await page.getByRole("button", { name: "Upload & Extract" }).click();
  await expect(page).toHaveURL(/document=/);
  await expect(page.getByText("Status: Structured")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Analyze Document" }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("link", { name: "Public Portal ↗", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
});

test("isolated project delete confirmation, restore and archive retain records", async ({
  page,
  baseURL,
}) => {
  await page.request.post("/api/admin/login", {
    headers: { origin: baseURL! },
    data: {
      email: "staff@example.invalid",
      password: "test-only-password-not-production",
    },
  });
  const original = structuredClone(fixtureProjects[0]);
  const ids = new Set([
    original.id,
    ...[
      original.sources,
      original.evidence,
      original.decisions,
      original.events,
      original.versions,
      original.feedback,
      original.opportunities,
      original.scopes,
    ]
      .flat()
      .map((r) => r.id),
  ]);
  const project = JSON.parse(JSON.stringify(original), (_key, value) =>
    typeof value === "string" && ids.has(value) ? "ui-admin-" + value : value,
  );
  project.title = "Isolated admin lifecycle test";
  const created = await page.request.post("/api/projects", {
    headers: { origin: baseURL! },
    data: project,
  });
  expect(created.status()).toBe(201);
  await page.goto("/admin?project=" + project.id);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Confirm deletion" }),
  ).toBeDisabled();
  await dialog.getByLabel("Type DELETE to confirm").fill("DELETE");
  await dialog.getByRole("button", { name: "Confirm deletion" }).click();
  await expect(page).toHaveURL(/tab=trash/);
  const row = page.getByRole("row").filter({ hasText: project.title });
  await expect(row).toContainText("Deleted");
  await row.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(row).toHaveCount(0);
  await page.goto("/admin?project=" + project.id);
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await page.goto("/admin?tab=trash");
  await expect(
    page.getByRole("row").filter({ hasText: project.title }),
  ).toContainText("Archived");
});

test("AI document dashboard uses the same four answers in admin and saved preview", async ({
  page,
  baseURL,
}) => {
  const { extractionProject } =
    await import("../../src/features/admin/services/extraction-project");
  const { fieldNames } =
    await import("../../src/features/admin/types/extraction");
  await page.request.post("/api/admin/login", {
    headers: { origin: baseURL! },
    data: {
      email: "staff@example.invalid",
      password: "test-only-password-not-production",
    },
  });
  const facts: Record<string, string> = {
    title: "Library dashboard test",
    municipality: "Toronto",
    category: "Municipal Budget",
    proposal: "Staff recommend longer library opening hours.",
    location: "100 Queen Street West, Toronto",
    residentComments: "Residents requested weekend opening hours.",
  };
  const project = extractionProject(
    "ui-library-dashboard-ai",
    "library.pdf",
    "https://example.org/library.pdf",
    {
      fields: fieldNames.map((name) => ({
        name,
        value: facts[name] ?? null,
        quote: facts[name] ?? null,
        page: facts[name] ? 1 : null,
      })),
      locations: [
        { label: facts.location, kind: "site", page: 1, quote: facts.location },
      ],
      events: [
        {
          title: "Budget adopted",
          date: "2026-02-10",
          description: "Council adopted the budget.",
          status: "Completed",
          type: "Council Decision",
          page: 1,
          quote: "Council adopted the budget.",
        },
        {
          title: "Preparing services",
          date: null,
          description: "Service planning is underway.",
          status: "Current",
          type: "Implementation",
          page: 1,
          quote: "Service planning is underway.",
        },
      ],
      warnings: [],
    },
    [
      {
        page: 1,
        text:
          Object.values(facts).join("\n") +
          "\nCouncil adopted the budget.\nService planning is underway.",
      },
    ],
  );
  const created = await page.request.post("/api/projects", {
    headers: { origin: baseURL! },
    data: project,
  });
  expect(created.status()).toBe(201);
  await page.route(
    "**/World/GeocodeServer/findAddressCandidates?**",
    async (route) => {
      await route.fulfill({
        json: {
          candidates: [
            {
              address: facts.location,
              score: 100,
              location: { x: -79.3839, y: 43.6534 },
              attributes: { Addr_type: "PointAddress", Country: "CAN" },
            },
          ],
        },
      });
    },
  );
  for (const path of [
    `/admin?project=${project.id}`,
    `/studio/${project.id}/preview`,
  ]) {
    await page.goto(path);
    const cards = page.locator("[data-project-answers] > section");
    await expect(cards).toHaveCount(4);
    await expect(page.locator('[data-state="draftDone"]')).toHaveCount(1);
    await expect(page.locator('[data-state="draftCurrent"]')).toHaveCount(1);
    await expect(page.locator("[data-document-map]")).toBeVisible();
    await expect(page.locator("[data-document-map]")).toContainText(
      facts.location,
    );
    await expect(
      page.getByRole("heading", { name: "Decision DNA", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText("WHAT CHANGED", { exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("heading", { name: "Geographic preview", exact: true }),
    ).toHaveCount(0);
    await expect(cards.nth(0)).toContainText(facts.proposal);
    await expect(cards.nth(1)).toContainText("No adopted decision");
    await expect(cards.nth(2)).toContainText(facts.location);
    await expect(cards.nth(3)).toContainText(facts.residentComments);
    await cards.nth(3).getByRole("button", { name: "View evidence" }).click();
    await expect(page.getByRole("dialog")).toContainText(
      facts.residentComments,
    );
    await expect(page.getByRole("dialog")).toContainText("Page 1");
    await page.getByRole("button", { name: "Close evidence" }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  // Review and publish the same record through the real workflow, then compare the public dashboard.
  const fields = [
    "evidence",
    "decisions",
    "title",
    "municipality",
    "category",
    "authority",
    "neighbourhood",
    "summary",
    "rationale",
    "status",
    "events",
    "sources",
    "opportunities",
    "scopes",
  ];
  // This fixture needs a sourced summary before it can be published.
  let saved = (await created.json()).project;
  saved.summary = facts.proposal;
  saved.summaryEvidenceId = project.id + "-proposal";
  const update = await page.request.put(`/api/projects/${project.id}`, {
    headers: { origin: baseURL! },
    data: { action: "save", project: saved },
  });
  expect(update.ok()).toBe(true);
  saved = (await update.json()).project;
  for (const field of fields) {
    const reviewed = await page.request.post(
      `/api/admin/projects/${project.id}/review`,
      {
        headers: { origin: baseURL! },
        data: { field, revision: saved.revision, verified: true },
      },
    );
    expect(reviewed.ok(), await reviewed.text()).toBe(true);
    saved.revision++;
  }
  for (const action of ["review", "verify", "publish"]) {
    const response = await page.request.put(`/api/projects/${project.id}`, {
      headers: { origin: baseURL! },
      data: {
        action,
        revision: saved.revision,
        note: "Reviewed source passages in isolated browser test.",
      },
    });
    expect(response.ok(), await response.text()).toBe(true);
    saved = (await response.json()).project;
  }
  await page.goto(`/projects/${project.id}`);
  await expect(page.locator("[data-project-answers] > section")).toHaveCount(4);
  await expect(page.locator('[data-state="done"]')).toHaveCount(1);
  await expect(page.locator('[data-state="current"]')).toHaveCount(1);
  await expect(page.locator("[data-document-map]")).toBeVisible();
  await expect(page.locator("[data-document-map]")).toContainText(
    facts.location,
  );
});
