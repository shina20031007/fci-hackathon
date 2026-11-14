import { expect, test } from "@playwright/test";

test("project overviews share four cards and group all linked evidence behind one button", async ({
  page,
}) => {
  const keyWarnings: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      message.text().includes('unique "key" prop')
    )
      keyWarnings.push(message.text());
  });
  for (const path of [
    "/projects/toronto-2024-ex11-8",
    ...["bathurst", "dufferin", "eglinton-east", "jane"].map(
      (slug) => `/projects/toronto-2024-ex11-8/corridors/${slug}`,
    ),
    "/projects/rapidto-bathurst",
    "/projects/maryhill-road",
    "/projects/toronto-35-bellevue",
    "/projects/toronto-kennedy-danforth-rental-demolition",
  ]) {
    await page.goto(path);
    const cards = page.locator("[data-project-answers] > section");
    await expect(cards).toHaveCount(4);
    await expect(cards.locator("h2")).toHaveText([
      "What's proposed?",
      "What has been decided?",
      "Where is this happening?",
      "What did residents say?",
    ]);
    for (const card of await cards.all())
      expect(await card.getByRole("button").count()).toBeLessThanOrEqual(1);
  }
  await page
    .locator("[data-project-answers] > section")
    .nth(2)
    .getByRole("button", { name: "View evidence" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const choices = dialog
    .getByRole("group", { name: "Choose evidence" })
    .getByRole("button");
  await expect(choices).toHaveCount(5);
  const firstEvidence = await dialog.locator(".mono").textContent();
  await choices.nth(1).click();
  await expect(choices.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.locator(".mono")).not.toHaveText(firstEvidence!);
  await expect(
    dialog.getByRole("link", { name: "Open official source" }),
  ).toHaveAttribute("href", /^https:\/\//);
  await dialog.getByRole("button", { name: "Close evidence" }).click();
  await expect(dialog).not.toBeVisible();
  expect(keyWarnings).toEqual([]);
});

test("fresh seed serves the published RapidTO overview and corridor pages", async ({
  page,
}) => {
  const overview = await page.goto("/projects/toronto-2024-ex11-8");
  expect(overview?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "RapidTO", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Bathurst Street", exact: true }),
  ).toBeVisible();

  for (const slug of ["bathurst", "dufferin", "eglinton-east", "jane"]) {
    const response = await page.goto(
      `/projects/toronto-2024-ex11-8/corridors/${slug}`,
    );
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toContainText("RapidTO:");
    await expect(
      page
        .getByRole("navigation", { name: "Corridor sections" })
        .getByRole("link", { name: "Project overview" }),
    ).toBeVisible();
  }
});

test("housing progress renders evidence controls without missing keys", async ({
  page,
}) => {
  const keyWarnings: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      message.text().includes('unique "key" prop')
    )
      keyWarnings.push(message.text());
  });
  const response = await page.goto("/projects/toronto-35-bellevue");
  expect(response?.status()).toBe(200);
  await page
    .locator('section[aria-label*="Project progress"] ol button')
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(keyWarnings).toEqual([]);
});
