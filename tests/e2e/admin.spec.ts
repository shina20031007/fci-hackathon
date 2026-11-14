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
