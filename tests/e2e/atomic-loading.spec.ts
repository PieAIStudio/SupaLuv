import { mkdir, writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const evidenceDir = ".devspace-visual/atomic-loading/e2e";

async function resetToTitle(page: import("@playwright/test").Page, query = "") {
  await page.goto(`/${query}`);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.getByTestId("boot-splash").click();
  await expect(page.getByTestId("title-screen")).toBeVisible();
}

function observePageIssues(page: import("@playwright/test").Page) {
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => failedRequests.push(request.url()));
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  return { pageErrors, failedRequests, consoleErrors };
}

test.beforeAll(async () => {
  await mkdir(evidenceDir, { recursive: true });
});

test("returning session waits for a decoded title composition", async ({ page }) => {
  const { pageErrors, failedRequests, consoleErrors } = observePageIssues(page);
  await page.route("https://us-assets.i.posthog.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: "" }),
  );
  await page.route("**/assets/scenes/bg-office-night.jpg", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.setItem("supaluv.boot.seen.v1", "1");
  });

  const startedAt = Date.now();
  await page.goto("/");
  const transition = page.getByTestId("atomic-loading-title");
  await expect(transition).toBeVisible();
  const transitionVisibleAt = Date.now();
  await expect(page.getByTestId("title-screen")).toHaveCount(0);
  await page.screenshot({ path: `${evidenceDir}/title-first-load-transition.png` });
  await expect(page.getByTestId("title-screen")).toBeVisible({ timeout: 10_000 });
  const titleReadyAt = Date.now();
  await expect(transition).toHaveCount(0);
  await page.screenshot({ path: `${evidenceDir}/title-first-load-ready.png` });

  await writeFile(
    `${evidenceDir}/title-first-load-timing.json`,
    JSON.stringify(
      {
        startedAt,
        transitionVisibleAt,
        titleReadyAt,
        feedbackLatencyMs: transitionVisibleAt - startedAt,
        transitionDurationMs: titleReadyAt - transitionVisibleAt,
        consoleErrors,
        pageErrors,
        failedRequests,
      },
      null,
      2,
    ),
  );

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});

test("new game shows a complete transition until casting is ready", async ({ page }) => {
  const { pageErrors, failedRequests, consoleErrors } = observePageIssues(page);
  const portraitRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/assets\/portraits\/(suming-base|zhou-neutral)\.png/.test(request.url())) {
      portraitRequests.push(request.url());
    }
  });
  await page.route("https://us-assets.i.posthog.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: "" }),
  );
  await page.route("**/assets/portraits/*.png", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_200));
    await route.continue();
  });

  await resetToTitle(page);
  await page.waitForTimeout(700);
  expect(portraitRequests).toEqual([]);
  failedRequests.length = 0;
  await page.screenshot({ path: `${evidenceDir}/title-desktop.png` });
  const clickedAt = Date.now();
  await page.getByTestId("title-new-game").click();

  const transition = page.getByTestId("atomic-loading-casting");
  await expect(transition).toBeVisible();
  const transitionVisibleAt = Date.now();
  await expect(transition).toContainText("正在打开选角工作台");
  const transitionBox = await transition.boundingBox();
  const viewport = page.viewportSize();
  expect(transitionBox?.width).toBe(viewport?.width);
  expect(transitionBox?.height).toBe(viewport?.height);
  await page.screenshot({ path: `${evidenceDir}/new-game-transition.png` });
  await expect(page.getByTestId("character-studio")).toBeVisible({ timeout: 10_000 });
  const castingReadyAt = Date.now();
  await expect(page.getByTestId("atomic-loading-casting")).toHaveCount(0);
  await page.screenshot({ path: `${evidenceDir}/casting-ready.png` });

  await writeFile(
    `${evidenceDir}/new-game-timing.json`,
    JSON.stringify(
      {
        clickedAt,
        transitionVisibleAt,
        castingReadyAt,
        feedbackLatencyMs: transitionVisibleAt - clickedAt,
        transitionDurationMs: castingReadyAt - transitionVisibleAt,
        consoleErrors,
        pageErrors,
        failedRequests,
        portraitRequests,
      },
      null,
      2,
    ),
  );

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});

test("deterministic fixture proves an atomic chapter transition", async ({ page }) => {
  const { pageErrors, failedRequests, consoleErrors } = observePageIssues(page);
  await page.route("**/*draft-ch02*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.continue();
  });

  await resetToTitle(page, "?atomic-loading-fixture=1");
  await page.getByTestId("title-new-game").click();
  await page.getByRole("button", { name: "使用官方形象" }).click();
  await page.getByRole("button", { name: "使用官方形象" }).click();
  await expect(page.getByTestId("game-viewport")).toBeVisible({ timeout: 15_000 });
  failedRequests.length = 0;

  const triggeredAt = Date.now();
  await page.evaluate(() => {
    const fixture = (
      window as Window & {
        __SUPALUV_ATOMIC_LOADING_TEST__?: { transitionToChapter2: () => void };
      }
    ).__SUPALUV_ATOMIC_LOADING_TEST__;
    if (!fixture) {
      throw new Error("atomic loading fixture is unavailable");
    }
    fixture.transitionToChapter2();
  });

  await expect(page.getByTestId("atomic-loading-chapter")).toBeVisible();
  const transitionVisibleAt = Date.now();
  await expect(page.getByTestId("game-viewport")).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/chapter-transition.png` });
  await expect(page.getByTestId("atomic-loading-chapter")).toHaveCount(0, { timeout: 15_000 });
  const chapterReadyAt = Date.now();
  await expect(page.getByTestId("story-label")).toContainText(/第二章|她不会评判你/);
  await page.screenshot({ path: `${evidenceDir}/chapter-02-ready.png` });

  await writeFile(
    `${evidenceDir}/chapter-timing.json`,
    JSON.stringify(
      {
        triggeredAt,
        transitionVisibleAt,
        chapterReadyAt,
        feedbackLatencyMs: transitionVisibleAt - triggeredAt,
        transitionDurationMs: chapterReadyAt - transitionVisibleAt,
        consoleErrors,
        pageErrors,
        failedRequests,
      },
      null,
      2,
    ),
  );

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});

test("title keeps the core action reachable at required viewports", async ({ browser }) => {
  const cases = [
    { name: "desktop-1440x900", width: 1440, height: 900, portraitGate: false },
    { name: "tablet-1024x768", width: 1024, height: 768, portraitGate: false },
    { name: "portrait-390x844", width: 390, height: 844, portraitGate: true },
    { name: "landscape-844x390", width: 844, height: 390, portraitGate: false },
  ] as const;
  const report: Array<Record<string, unknown>> = [];

  for (const viewport of cases) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    const { pageErrors, failedRequests, consoleErrors } = observePageIssues(page);
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.setItem("supaluv.boot.seen.v1", "1");
    });
    await page.route("https://us-assets.i.posthog.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/javascript", body: "" }),
    );
    await page.goto("/");
    await expect(page.getByTestId("title-screen")).toBeVisible();

    if (viewport.portraitGate) {
      await expect(page.getByTestId("orientation-gate")).toBeVisible();
    } else {
      const button = page.getByTestId("title-new-game");
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      expect(box).toBeTruthy();
      expect((box?.x ?? -1) >= 0).toBeTruthy();
      expect((box?.y ?? -1) >= 0).toBeTruthy();
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewport.width);
      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(viewport.height);
    }

    const layout = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      bodyScrollWidth: document.body.scrollWidth,
      bodyScrollHeight: document.body.scrollHeight,
      documentScrollWidth: document.documentElement.scrollWidth,
      documentScrollHeight: document.documentElement.scrollHeight,
    }));
    expect(layout.bodyScrollWidth).toBeLessThanOrEqual(viewport.width);
    expect(layout.documentScrollWidth).toBeLessThanOrEqual(viewport.width);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
    await page.screenshot({ path: `${evidenceDir}/title-${viewport.name}.png` });
    report.push({ viewport, layout, consoleErrors, pageErrors, failedRequests });
    await context.close();
  }

  await writeFile(`${evidenceDir}/responsive-title-report.json`, JSON.stringify(report, null, 2));
});
