import { defineConfig } from "@playwright/test";

const webPort = Number(process.env.SUPALUV_E2E_WEB_PORT ?? 5177);
const webBaseUrl = `http://127.0.0.1:${webPort}`;

export default defineConfig({
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: webBaseUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
  },
  webServer: {
    command: `SUPALUV_E2E_WEB_PORT=${webPort} VITE_SWIMMER_CORE_SUPABASE_URL=https://e2e.supabase.co VITE_SWIMMER_CORE_PUBLISHABLE_KEY=e2e-public-key pnpm --filter @supaluv/web dev`,
    url: webBaseUrl,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "1",
    timeout: 120_000,
  },
});
