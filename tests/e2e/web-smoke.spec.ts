import { expect, test } from "@playwright/test";

async function clickIfVisible(page: import("@playwright/test").Page, name: RegExp) {
  const button = page.getByRole("button", { name });
  await page
    .getByTestId("story-copy")
    .click()
    .catch(() => undefined);
  await expect(button.first()).toBeVisible({ timeout: 10_000 });
  await button.first().click();
}

test("commercial shell: cinematic title, play, system save", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");
  // Ensure no leftover save trips new-game confirm.
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();

  // Boot splash requires a click to unlock audio (session-scoped).
  const boot = page.getByTestId("boot-splash");
  if (await boot.isVisible().catch(() => false)) {
    await boot.click();
  }

  await expect(page.getByTestId("title-screen")).toBeVisible();
  await page.getByRole("button", { name: "中文" }).click();
  await expect(page.getByRole("heading", { name: "超级爱人" })).toBeVisible();
  // A fast double-click must not create two asynchronous story runtimes.
  await page.getByTestId("title-new-game").dblclick();

  await expect(page.getByTestId("game-viewport")).toBeVisible();
  await expect(page.getByTestId("fullscreen-toggle")).toBeVisible();
  await expect(page.getByTestId("system-menu-toggle")).toBeVisible();

  const stageBox = await page.getByTestId("vn-stage").boundingBox();
  expect(stageBox).toBeTruthy();
  if (stageBox) {
    const ratio = stageBox.width / stageBox.height;
    expect(ratio).toBeGreaterThan(1.6);
    expect(ratio).toBeLessThan(1.9);
  }

  await expect(page.getByTestId("cutscene-layer")).toBeVisible();
  await page.getByRole("button", { name: /跳过 CG/i }).click();

  await clickIfVisible(page, /^继续$/i);
  await clickIfVisible(page, /^继续$/i);
  await clickIfVisible(page, /^继续$/i);
  await page.getByTestId("story-copy").click();
  await expect(page.getByRole("button", { name: /立刻删掉/i })).toBeVisible({ timeout: 10_000 });

  const dialogue = page.getByTestId("dialogue-box");
  const box = await dialogue.boundingBox();
  expect(box && box.height > 140).toBeTruthy();

  await page.getByTestId("history-toggle").click({ force: true });
  await expect(page.getByTestId("history-drawer")).toBeVisible();
  await page.getByRole("button", { name: "关闭" }).click({ force: true });

  await page.getByTestId("system-menu-toggle").click({ force: true });
  await expect(page.getByTestId("system-menu")).toBeVisible();
  await expect(page.getByTestId("autoplay-toggle")).toBeVisible();
  await page.getByTestId("save-button").click({ force: true });
  await expect(page.getByTestId("save-toast")).toBeVisible();

  // Esc closes system menu
  await page.getByTestId("system-menu-toggle").click({ force: true });
  await expect(page.getByTestId("system-menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("system-menu")).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});
