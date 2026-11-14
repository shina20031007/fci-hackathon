import { expect, test } from "@playwright/test";

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
      page.getByRole("link", { name: "Decision Timeline" }),
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
