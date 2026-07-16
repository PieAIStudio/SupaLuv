import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const workspaceRoot = path.resolve(import.meta.dirname, "../..");
const evidenceRoot = path.join(workspaceRoot, ".devspace-visual/round16-prop-stage/round-03");

test.use({ hasTouch: true });

async function stubNonessentialApis(page: Page) {
  await page.route("**/api/choice-stats**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );
  await page.route("**/api/tts/synthesize", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  );
  await page.route("**/api/ai/branch", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  );
}

async function startStory(page: Page, storyId: "draft-ch01" | "draft-ch02") {
  await stubNonessentialApis(page);
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem("supaluv.boot.seen.v1", "1");
  });
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
  if ((await selector.inputValue()) !== storyId) {
    await selector.selectOption(storyId);
    await expect(selector).toHaveValue(storyId);
  }
  await page.waitForFunction(
    () =>
      typeof (
        window as Window & {
          __SUPALUV_PROP_STAGE_TEST__?: { jumpTo?: unknown };
        }
      ).__SUPALUV_PROP_STAGE_TEST__?.jumpTo === "function",
  );
}

async function jumpToPropScene(page: Page, sceneId: string, propId: string) {
  await page.evaluate((targetSceneId) => {
    const fixture = (
      window as Window & {
        __SUPALUV_PROP_STAGE_TEST__?: { jumpTo: (sceneId: string) => void };
      }
    ).__SUPALUV_PROP_STAGE_TEST__;
    if (!fixture) {
      throw new Error("prop stage fixture is unavailable");
    }
    fixture.jumpTo(targetSceneId);
  }, sceneId);
  const dialog = page.getByTestId("prop-cutin-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("data-prop-id", propId);
  await expect(page.getByTestId("prop-cutin-close")).toBeFocused();
  return dialog;
}

test.beforeAll(async () => {
  await fs.mkdir(evidenceRoot, { recursive: true });
});

test("desktop protocol cut-in traps focus, yields the interaction, restores focus, and resets one-shot memory", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await startStory(page, "draft-ch01");
  const dialog = await jumpToPropScene(page, "dch01_protocol_test", "prop-protocol-terms");
  await expect(page.getByTestId("protocol-test")).toHaveCount(0);
  await expect(dialog.getByText("完整可读内容")).toBeVisible();
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  await page.getByTestId("game-viewport").screenshot({
    path: path.join(evidenceRoot, "desktop-1440x900-protocol.png"),
  });

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId("protocol-test")).toBeVisible();
  await expect(page.getByTestId("prop-cutin-reopen")).toBeFocused();
  await page.waitForTimeout(300);
  await expect(page.getByTestId("prop-cutin-dialog")).toHaveCount(0);

  await page.getByTestId("prop-cutin-reopen").click();
  await expect(page.getByTestId("prop-cutin-dialog")).toBeVisible();
  await page.getByTestId("prop-cutin-close").click();
  await expect(page.getByTestId("protocol-test")).toBeVisible();

  await page.getByTestId("system-menu-toggle").click();
  await page.getByRole("menuitem", { name: "重来本章" }).click();
  await expect(page.getByTestId("game-viewport")).toBeVisible();
  await jumpToPropScene(page, "dch01_protocol_test", "prop-protocol-terms");
});
test("mobile landscape barcode cut-in stays inside the viewport and closes by touch before interaction", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await startStory(page, "draft-ch02");
  const dialog = await jumpToPropScene(page, "dch02_barcode_sweep", "prop-barcode-shift");
  await expect(page.getByTestId("barcode-sweep")).toHaveCount(0);
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(844);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(390);
  await page.getByTestId("game-viewport").screenshot({
    path: path.join(evidenceRoot, "mobile-844x390-barcode.png"),
  });
  const closeBounds = await page.getByTestId("prop-cutin-close").boundingBox();
  expect(closeBounds).not.toBeNull();
  await page.touchscreen.tap(
    closeBounds!.x + closeBounds!.width / 2,
    closeBounds!.y + closeBounds!.height / 2,
  );
  await expect(page.getByTestId("prop-cutin-dialog")).toHaveCount(0);
  await expect(page.getByTestId("barcode-sweep")).toBeVisible();
});

test("desktop NDA cut-in is a cinematic stage layer with complete text", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await startStory(page, "draft-ch02");
  const dialog = await jumpToPropScene(page, "dch02_s037", "prop-application-nda");
  await expect(dialog.getByRole("heading", { name: /体验官申请与超级保密协议/ })).toBeVisible();
  const accessibleText = dialog.locator(".prop-cutin-transcript p");
  await expect(accessibleText).toBeVisible();
  expect((await accessibleText.textContent())?.length ?? 0).toBeGreaterThan(80);
  await page.getByTestId("game-viewport").screenshot({
    path: path.join(evidenceRoot, "desktop-1440x900-nda.png"),
  });
  await page.getByTestId("prop-cutin-close").click();
  await expect(page.getByTestId("dialogue-box")).toBeVisible();
});

test("image failure immediately falls back to complete text and closing still permits story continue", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/assets/props/prop-application-nda.png", (route) =>
    route.fulfill({ status: 404, contentType: "text/plain", body: "missing fixture" }),
  );
  await startStory(page, "draft-ch02");
  const dialog = await jumpToPropScene(page, "dch02_s037", "prop-application-nda");
  await expect(dialog).toHaveAttribute("data-image-status", "failed");
  await expect(page.getByTestId("prop-cutin-fallback")).toBeVisible();
  await expect(dialog.locator(".prop-cutin-transcript p")).toBeVisible();
  await page.getByTestId("game-viewport").screenshot({
    path: path.join(evidenceRoot, "desktop-1440x900-image-failure.png"),
  });

  await page.getByTestId("prop-cutin-close").click();
  await page.getByTestId("story-copy").click();
  const continueButton = page.getByRole("button", { name: /剧情选择: 继续/ });
  await expect(continueButton).toBeVisible();
  await continueButton.click();
  await expect(page.getByTestId("prop-cutin-reopen")).toHaveCount(0);
  await expect(page.getByTestId("mobile-questionnaire")).toBeVisible();
});
