import { expect, test } from "@playwright/test";

test("defaults to prototype story and can switch to chapter 01 trial", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("vn-stage")).toBeVisible();
  await expect(page.getByTestId("dialogue-box")).toBeVisible();
  await expect(page.getByTestId("prototype-badge")).toBeVisible();
  await expect(page.getByLabel(/story selector/i)).toHaveValue("prototype-act1");
  await expect(page.getByTestId("story-map-panel")).toBeHidden();
  await expect(page.getByRole("heading", { name: /静态故事总览图/i })).toBeHidden();

  const firstChoice = page.getByRole("button", { name: /继续测试/i });
  await expect(firstChoice).toBeVisible();
  await firstChoice.click();

  await expect(page.getByText(/论坛贴/)).toBeVisible();

  await page.getByLabel(/story selector/i).selectOption("chapter-01-trial");
  await expect(page.getByLabel(/story selector/i)).toHaveValue("chapter-01-trial");
  await expect(page.getByTestId("story-label")).toHaveText(/退款期已过/i);

  const trialChoice = page.getByRole("button", { name: /查看物业照片/i });
  await expect(trialChoice).toBeVisible();
  await trialChoice.click();
  await expect(page.getByTestId("dialogue-box").getByText(/物业前台/i)).toBeVisible();

  await page.getByRole("button", { name: /creator map/i }).click();
  await expect(page.getByTestId("story-map-panel")).toBeVisible();
  await expect(page.getByRole("heading", { name: /静态故事总览图/i })).toBeVisible();
});
