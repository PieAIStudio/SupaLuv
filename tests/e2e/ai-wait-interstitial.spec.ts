import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const workspaceRoot = path.resolve(import.meta.dirname, "../..");
const evidenceDir = path.join(workspaceRoot, ".scratch/grok-reports/evidence");

const fakeSession = {
  access_token: "e2e-access-token",
  refresh_token: "e2e-refresh-token",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: {
    id: "00000000-0000-4000-8000-000000000001",
    aud: "authenticated",
    role: "authenticated",
    email: "player@example.test",
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: "2026-07-12T00:00:00.000Z",
  },
};

async function installSignedInSession(page: Page) {
  await page.addInitScript((session) => {
    localStorage.setItem("supaluv.swimmer.auth.v1", JSON.stringify(session));
    sessionStorage.setItem("supaluv.boot.seen.v1", "1");
  }, fakeSession);
  await page.route("**/api/wallet/balance", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: '{"batteries":99}' }),
  );
  await page.route("**/api/ai/health", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        tts: { providers: { elevenlabs: false, minimax: false }, freeformEnabled: false },
      }),
    }),
  );
  await page.route("**/api/choice-stats**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: '{"counts":{}}' }),
  );
  await page.route("**/tts/synthesize", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"error":"disabled_in_e2e"}',
    }),
  );
}

/** Hold AI branch loading long enough for the wait interstitial to paint. */
async function installDelayedAiBranch(page: Page, delayMs: number) {
  await page.route("**/api/ai/branch", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        choiceLabel: "e2e delayed AI choice",
        beats: [
          {
            speaker: "苏明",
            text: "e2e beat for wait interstitial",
            artKey: "bg-office-night",
            portraitKey: "suming-shame",
            mood: "shame",
          },
        ],
        rejoinSceneId: "dch01_s012",
        provider: "e2e-mock",
      }),
    });
  });
}

async function openDraftCh01AtScene(page: Page, sceneId: string) {
  await page.goto("/?debug=1&prop-stage-fixture=1");
  const boot = page.locator('[data-testid="boot-splash"][role="button"]');
  if (await boot.isVisible().catch(() => false)) {
    await boot.click();
    const ageConfirm = page.getByTestId("age-gate-confirm");
    if (await ageConfirm.isVisible().catch(() => false)) {
      await ageConfirm.click();
    }
  }
  await expect(page.getByTestId("title-screen")).toBeVisible({ timeout: 10_000 });
  const chinese = page.getByRole("button", { name: "中文", exact: true });
  if (await chinese.isVisible().catch(() => false)) {
    await chinese.click();
  }
  await page.getByTestId("title-new-game").click();
  const official = page.getByRole("button", { name: "使用官方形象" });
  await official.first().click();
  await official.first().click();
  await expect(page.getByTestId("game-viewport")).toBeVisible({ timeout: 10_000 });

  const selector = page.locator('select[aria-label="Story selector"]');
  await expect(selector).toBeVisible();
  if ((await selector.inputValue()) !== "draft-ch01") {
    await selector.selectOption("draft-ch01");
  }
  await page.waitForFunction(
    () =>
      typeof (
        window as Window & {
          __SUPALUV_PROP_STAGE_TEST__?: { jumpTo?: unknown };
        }
      ).__SUPALUV_PROP_STAGE_TEST__?.jumpTo === "function",
  );

  await page.evaluate((target) => {
    const fixture = (
      window as Window & {
        __SUPALUV_PROP_STAGE_TEST__?: { jumpTo: (sceneId: string) => void };
      }
    ).__SUPALUV_PROP_STAGE_TEST__;
    if (!fixture) {
      throw new Error("prop stage fixture unavailable");
    }
    fixture.jumpTo(target);
  }, sceneId);
}

test("AI branch wait shows Heartbeat Engine interstitial under mock delay", async ({ page }) => {
  await installSignedInSession(page);
  await installDelayedAiBranch(page, 8_000);
  await openDraftCh01AtScene(page, "dch01_s011");

  // Finish typewriter so the choice stack (and waiting AI button) can render.
  for (let i = 0; i < 12; i += 1) {
    const waiting = page.getByTestId("ai-choice-waiting");
    if (await waiting.isVisible().catch(() => false)) {
      break;
    }
    const ready = page.getByTestId("ai-choice-ready");
    if (await ready.isVisible().catch(() => false)) {
      break;
    }
    await page.getByTestId("story-copy").click().catch(() => undefined);
    await page.waitForTimeout(120);
  }

  await expect(page.getByTestId("ai-choice-waiting")).toBeVisible({ timeout: 8_000 });
  const interstitial = page.getByTestId("ai-wait-interstitial");
  await expect(interstitial).toBeVisible();
  await expect(interstitial).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByTestId("ai-wait-interstitial-line")).not.toHaveText("");

  await fs.mkdir(evidenceDir, { recursive: true });
  await page.screenshot({
    path: path.join(evidenceDir, "ai-wait-interstitial.png"),
    fullPage: false,
  });

  // When the delayed response lands, wait chrome must disappear without holding the result.
  await expect(page.getByTestId("ai-choice-ready")).toBeVisible({ timeout: 12_000 });
  await expect(page.getByTestId("ai-wait-interstitial")).toHaveCount(0);
  await expect(page.getByTestId("ai-choice-waiting")).toHaveCount(0);
});
