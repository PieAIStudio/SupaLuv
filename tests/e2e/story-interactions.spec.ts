import { expect, test, type Page } from "@playwright/test";

async function startFreshChapter(page: Page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.setItem("supaluv.boot.seen.v1", "1");
  });
  await page.reload();
  await page.getByTestId("title-new-game").click();
  const official = page.getByRole("button", { name: "使用官方形象" });
  await official.click();
  await official.click();
  await expect(page.getByTestId("game-viewport")).toBeVisible();
}

async function revealAndContinue(page: Page) {
  await page
    .getByTestId("story-copy")
    .click()
    .catch(() => undefined);
  const button = page.getByRole("button", { name: /^继续$/ });
  await expect(button).toBeVisible();
  await button.click();
}

async function enterCalibration(page: Page) {
  await revealAndContinue(page);
  await expect(page.getByTestId("emotion-calibration")).toBeVisible();
  await expect(page.getByTestId("vn-stage")).toHaveAttribute(
    "data-story-interaction",
    "emotion-calibration-v1",
  );
}

test("emotion calibration accepts keyboard bands and returns to authored chapter text", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await startFreshChapter(page);
  await enterCalibration(page);

  await expect(page.getByRole("heading", { name: "情绪样本校准" })).toBeVisible();
  await expect(page.getByText("报告收到了，辛苦。明天再聊。")).toBeVisible();

  await page.getByTestId("history-toggle").click({ force: true });
  await expect(page.getByTestId("history-drawer")).toBeVisible();
  await page.getByRole("button", { name: "关闭" }).click({ force: true });
  await expect(page.getByTestId("emotion-calibration")).toHaveAttribute("data-step", "1");

  await page.keyboard.press("1");
  await expect(page.getByTestId("emotion-feedback")).toContainText("校准一致");
  await expect(page.getByTestId("emotion-calibration")).toHaveAttribute("data-step", "2");
  await page.keyboard.press("2");
  await expect(page.getByTestId("emotion-calibration")).toHaveAttribute("data-step", "3");
  await page.keyboard.press("3");

  await expect(page.getByTestId("dialogue-box")).toBeVisible();
  await page.getByTestId("story-copy").click();
  await expect(page.getByText(/三格指示灯同时转绿/)).toBeVisible();
  await expect(page.getByTestId("vn-stage")).toHaveAttribute("data-story-interaction", "none");

  await revealAndContinue(page);
  await expect(page.getByTestId("story-copy")).toContainText(/协议贴在门后头/);
  expect(pageErrors).toEqual([]);
});

test("skip is non-blocking and its authored result restores from autosave", async ({ page }) => {
  await startFreshChapter(page);
  await enterCalibration(page);
  await page.keyboard.press("1");
  await expect(page.getByTestId("emotion-calibration")).toHaveAttribute("data-step", "2");
  await page.getByTestId("emotion-calibration-skip").click();

  await expect(page.getByTestId("dialogue-box")).toBeVisible();
  await page.getByTestId("story-copy").click();
  await expect(page.getByText(/主测照常/)).toBeVisible();

  await page.reload();
  await page.getByTestId("title-continue").click();
  await expect(page.getByTestId("dialogue-box")).toBeVisible();
  await page.getByTestId("story-copy").click();
  await expect(page.getByText(/人工判断保留/)).toBeVisible();
  await expect(page.getByTestId("emotion-calibration")).toHaveCount(0);

  await revealAndContinue(page);
  await expect(page.getByTestId("story-copy")).toContainText(/协议贴在门后头/);
});

test("landscape phone keeps all calibration choices inside the 16:9 stage", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await startFreshChapter(page);
  await enterCalibration(page);

  const stage = await page.getByTestId("vn-stage").boundingBox();
  const interaction = await page.getByTestId("emotion-calibration").boundingBox();
  const hud = await page.locator(".vn-hud").boundingBox();
  const progress = await page.locator(".emotion-calibration-progress").boundingBox();
  expect(stage).toBeTruthy();
  expect(interaction).toBeTruthy();
  expect(hud).toBeTruthy();
  expect(progress).toBeTruthy();
  if (stage && interaction) {
    expect(interaction.x).toBeGreaterThanOrEqual(stage.x);
    expect(interaction.y).toBeGreaterThanOrEqual(stage.y);
    expect(interaction.x + interaction.width).toBeLessThanOrEqual(stage.x + stage.width + 1);
    expect(interaction.y + interaction.height).toBeLessThanOrEqual(stage.y + stage.height + 1);
  }
  if (hud && progress) {
    expect(progress.y).toBeGreaterThanOrEqual(hud.y + hud.height - 1);
  }

  await expect(page.getByTestId("emotion-level-calm")).toBeVisible();
  await expect(page.getByTestId("emotion-level-sting")).toBeVisible();
  await expect(page.getByTestId("emotion-level-overload")).toBeVisible();
  await expect(page.getByTestId("emotion-calibration-skip")).toBeVisible();
});
