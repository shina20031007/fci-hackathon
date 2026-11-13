import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";
const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: [
            "--use-gl=angle",
            "--use-angle=swiftshader",
            "--enable-unsafe-swiftshader",
          ],
        },
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      DATABASE_URL: `file:${resolve(".test-data/e2e.db")}`,
      STUDIO_ENABLED: "true",
      NEXT_DIST_DIR: ".next-test",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
