import { expect, test, type Page } from "@playwright/test";

/**
 * Visual contract: machine-checkable "does it actually read on screen" rules.
 *
 * These encode intent for states that pixel screenshots cannot judge and
 * humans keep re-reporting after unrelated changes:
 * - interactive controls must be fully visible, never clipped to slivers;
 * - dimmed (non-speaker) portraits must stay clearly visible;
 * - dark surfaces must resolve UIKit text tokens to light colors.
 */

function relativeLuminance(rgb: string): number {
  const m = rgb.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (!m) return -1;
  const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

async function startNewGame(page: Page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.setItem("supaluv.boot.seen.v1", "1");
  });
  await page.reload();
  const boot = page.locator('[data-testid="boot-splash"][role="button"]');
  if (await boot.isVisible().catch(() => false)) {
    await boot.click();
  }
  await expect(page.getByTestId("title-screen")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "中文", exact: true }).click();
}

test("dark meta surfaces resolve UIKit text tokens to light colors", async ({ page }) => {
  await startNewGame(page);

  // Title menu ghost buttons must not read as disabled brown-on-dark.
  const ghost = page.getByRole("button", { name: "设定" });
  await expect(ghost).toBeVisible();
  const ghostColor = await ghost.evaluate((el) => getComputedStyle(el).color);
  expect(relativeLuminance(ghostColor), `title ghost text ${ghostColor}`).toBeGreaterThan(0.4);

  // Light pills on the same dark panel must keep dark-on-light text
  // (regression: a surface-wide token override inverted them to light-on-light).
  const guest = page.getByRole("button", { name: /游客登录/ });
  await expect(guest).toBeVisible();
  const guestStyles = await guest.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { color: cs.color, background: cs.backgroundColor };
  });
  const guestTextLum = relativeLuminance(guestStyles.color);
  const guestBgLum = relativeLuminance(guestStyles.background);
  expect(
    Math.abs(guestTextLum - guestBgLum),
    `guest button ${guestStyles.color} on ${guestStyles.background}`,
  ).toBeGreaterThan(0.3);

  // Character studio header badge and back button.
  await page.getByTestId("title-new-game").click();
  await expect(page.getByTestId("character-studio")).toBeVisible({ timeout: 10_000 });
  const badge = page.locator(".character-studio-header .game-ui-badge");
  await expect(badge).toBeVisible();
  const badgeColor = await badge.evaluate((el) => getComputedStyle(el).color);
  expect(relativeLuminance(badgeColor), `studio badge text ${badgeColor}`).toBeGreaterThan(0.4);
});

test("stage keeps choices fully visible and non-speaker portraits readable", async ({ page }) => {
  await startNewGame(page);
  await page.getByTestId("title-new-game").click();
  await expect(page.getByTestId("character-studio")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "使用官方形象" }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "使用官方形象" }).click();
  await expect(page.getByTestId("game-viewport")).toBeVisible({ timeout: 15_000 });

  // Reveal scene 1 fully so the continue choice renders.
  const firstChoice = page.locator(".choice-button").first();
  for (let i = 0; i < 6; i += 1) {
    if (await firstChoice.isVisible().catch(() => false)) break;
    await page
      .getByTestId("story-copy")
      .click({ force: true })
      .catch(() => {});
    await page.waitForTimeout(350);
  }
  await expect(firstChoice).toBeVisible();

  // Contract: the choice button is fully inside the visible choice stack —
  // no sliver clipping (regression: percentage max-height collapsed the stack).
  const clip = await page.evaluate(() => {
    const btn = document.querySelector(".choice-button");
    const stack = document.querySelector(".choice-stack");
    if (!btn || !stack) return null;
    const b = btn.getBoundingClientRect();
    const s = stack.getBoundingClientRect();
    return {
      btnHeight: b.height,
      overflowBelow: Math.max(0, Math.round(b.bottom - s.bottom)),
      stackScrollGap: stack.scrollHeight - stack.clientHeight,
    };
  });
  expect(clip).not.toBeNull();
  expect(clip?.btnHeight ?? 0).toBeGreaterThan(24);
  // With a single continue choice nothing may be cut or need scrolling.
  expect(clip?.overflowBelow ?? 99).toBeLessThanOrEqual(1);
  expect(clip?.stackScrollGap ?? 99).toBeLessThanOrEqual(1);

  // Contract: dimmed non-speaker portraits stay clearly visible.
  const dimmed = page.locator(".portrait-slot.is-dim").first();
  if (await dimmed.isVisible().catch(() => false)) {
    const opacity = await dimmed.evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(opacity, "non-speaker portrait opacity").toBeGreaterThanOrEqual(0.6);
  }

  // Contract: choice label text is light on the dark dialogue panel.
  const labelColor = await firstChoice.evaluate((el) => getComputedStyle(el).color);
  expect(relativeLuminance(labelColor), `choice text ${labelColor}`).toBeGreaterThan(0.4);
});
