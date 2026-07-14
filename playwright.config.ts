import { defineConfig } from "@playwright/test";

const webPort = Number(process.env.SUPALUV_E2E_WEB_PORT ?? 5177);
const webBaseUrl = `http://127.0.0.1:${webPort}`;

export default defineConfig({
  timeout: process.env.CI ? 60_000 : 30_000,
  expect: { timeout: process.env.CI ? 10_000 : 5_000 },
  retries: process.env.CI ? 1 : 0,
  fullyParallel: false,
  // The game suites share one Vite runtime; serial workers avoid teardown leaks
  // from concurrent audio/save sessions and keep local/CI evidence deterministic.
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: webBaseUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
    // Keep legacy smoke suites deterministic; locale-specific coverage opts
    // into English explicitly instead of inheriting the host machine locale.
    locale: "zh-CN",
  },
  webServer: {
    command: `SUPALUV_E2E_WEB_PORT=${webPort} VITE_ENABLE_POSTHOG=false VITE_SUPALUV_COPLAY_TRANSPORT=broadcast VITE_SWIMMER_CORE_SUPABASE_URL=https://e2e.supabase.co VITE_SWIMMER_CORE_PUBLISHABLE_KEY=e2e-public-key pnpm --filter @supaluv/web dev`,
    url: webBaseUrl,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "1",
    timeout: 120_000,
  },
});
