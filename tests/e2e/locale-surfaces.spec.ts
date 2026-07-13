import { expect, test } from "@playwright/test";

async function openTitle(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.setItem("supaluv.boot.seen.v1", "1");
  });
  await page.goto("/");
  await expect(page.getByTestId("title-screen")).toBeVisible();
}

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const width = await page.evaluate(() => window.innerWidth);
  const layout = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(layout.body).toBeLessThanOrEqual(width);
  expect(layout.document).toBeLessThanOrEqual(width);
}

test("English title keeps Character Studio and AI spend primary actions in English", async ({
  page,
}) => {
  await openTitle(page);
  await page.getByRole("button", { name: "EN", exact: true }).click();

  await expect(page.getByRole("heading", { name: "SupaLuv" })).toBeVisible();
  await expect(page.getByTestId("title-ai-spend")).toHaveText("AI spend analysis");
  await page.getByTestId("title-new-game").click();

  await expect(
    page.getByRole("heading", { name: "Cast the leads before rolling camera" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Use official portrait" })).toBeVisible();
  await expect(page.getByRole("button", { name: "使用官方形象" })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  // A real scene unlock proves runtime toasts follow the active locale too.
  await page.getByRole("button", { name: "Use official portrait" }).click();
  await page.getByRole("button", { name: "Use official portrait" }).click();
  await expect(page.getByTestId("game-viewport")).toBeVisible();
  await expect(page.getByTestId("unlock-toast")).toContainText("Gallery");
  await expect(page.getByTestId("unlock-toast")).not.toContainText("图鉴");

  await page.getByTestId("system-menu-toggle").click();
  await page.getByRole("menuitem", { name: "Return to title" }).click();

  await page.getByTestId("title-ai-spend").click();
  await expect(page.getByRole("heading", { name: "AI spend analysis" })).toBeVisible();
  await expect(page.getByText("Sign-in required")).toBeVisible();
  await expect(page.getByText("需要登录")).toHaveCount(0);
});
test("Chinese title keeps Character Studio primary actions in Chinese", async ({ page }) => {
  await openTitle(page);
  await page.getByRole("button", { name: "中文", exact: true }).click();

  await expect(page.getByRole("heading", { name: "超级爱人" })).toBeVisible();
  await page.getByTestId("title-new-game").click();

  await expect(page.getByRole("heading", { name: "先选演员，再开机" })).toBeVisible();
  await expect(page.getByRole("button", { name: "使用官方形象" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Use official portrait" })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});
