import { expect, test, type Page } from "@playwright/test";

const PATH_MEMORY_KEY = "supaluv.path-memory.v2";
const FUTURE_SENTINEL = "初审通过";

async function prepareNewGame(page: Page): Promise<void> {
  await page.route("**/choice-stats**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: '{"counts":{}}' }),
  );
  await page.route("**/tts/synthesize", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: '{"audioUrl":null}',
    }),
  );
  await page.route("**/ai/branch", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"error":"disabled_in_player_path_e2e"}',
    }),
  );

  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.setItem("supaluv.boot.seen.v1", "1");
  });
  await page.reload();
  await page.getByTestId("title-new-game").click();
  await page.getByRole("button", { name: "使用官方形象" }).click();
  await page.getByRole("button", { name: "使用官方形象" }).click();
  await expect(page.getByTestId("game-viewport")).toBeVisible();
}

async function selectedChoiceCount(page: Page): Promise<number> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const store = JSON.parse(raw) as {
      routes?: Record<
        string,
        { scenes?: Record<string, { choices?: { selectedAt?: string | null }[] }> }
      >;
    };
    return Object.values(store.routes ?? {}).reduce(
      (total, route) =>
        total +
        Object.values(route.scenes ?? {}).reduce(
          (sceneTotal, scene) =>
            sceneTotal +
            (scene.choices ?? []).filter((choice) => Boolean(choice.selectedAt)).length,
          0,
        ),
      0,
    );
  }, PATH_MEMORY_KEY);
}

async function revealAndChooseFirst(page: Page): Promise<boolean> {
  await page
    .getByTestId("story-copy")
    .click()
    .catch(() => undefined);
  const choice = page.locator(".choice-button:not(.ai-choice-button)").first();
  if (!(await choice.isVisible().catch(() => false))) {
    return false;
  }
  await choice.click();
  return true;
}

async function openPlayerPath(page: Page): Promise<void> {
  await page.getByTestId("system-menu-toggle").click({ force: true });
  await expect(page.getByTestId("system-menu")).toBeVisible();
  await expect(page.getByTestId("player-path-menu-button")).toBeVisible();
  await expect(page.getByTestId("creator-map-menu-button")).toHaveCount(0);
  await page.getByTestId("player-path-menu-button").click({ force: true });
  await expect(page.getByTestId("player-path-panel")).toBeVisible();
}

async function assertSentinelAbsent(page: Page, capturedConsole: readonly string[]): Promise<void> {
  const leakSurface = await page.evaluate(
    ({ pathKey, sentinel }) => {
      const ariaAndTitles = Array.from(document.querySelectorAll("[aria-label], [title]"))
        .flatMap((element) => [element.getAttribute("aria-label"), element.getAttribute("title")])
        .filter(Boolean)
        .join("\n");
      const flowNodes = Array.from(document.querySelectorAll(".react-flow__node"))
        .map((node) => ({
          text: node.textContent,
          aria: node.getAttribute("aria-label"),
          title: node.getAttribute("title"),
        }))
        .map((value) => JSON.stringify(value))
        .join("\n");
      return {
        dom: document.documentElement.textContent?.includes(sentinel) ?? false,
        ariaAndTitles: ariaAndTitles.includes(sentinel),
        reactFlowNodeData: flowNodes.includes(sentinel),
        localStorage: (localStorage.getItem(pathKey) ?? "").includes(sentinel),
      };
    },
    { pathKey: PATH_MEMORY_KEY, sentinel: FUTURE_SENTINEL },
  );
  expect(leakSurface).toEqual({
    dom: false,
    ariaAndTitles: false,
    reactFlowNodeData: false,
    localStorage: false,
  });
  expect(capturedConsole.some((message) => message.includes(FUTURE_SENTINEL))).toBe(false);
}

test("我的路线 records two choices, shows gray alternatives, survives refresh, and leaks no future prose", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const networkFailures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleErrors.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const errorText = request.failure()?.errorText ?? "";
    if (errorText.includes("ERR_ABORTED")) {
      return;
    }
    networkFailures.push(`${request.method()} ${request.url()} ${errorText}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.url().includes("/ai/branch")) {
      networkFailures.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await prepareNewGame(page);

  await revealAndChooseFirst(page);
  await expect(page.getByTestId("emotion-calibration")).toBeVisible();
  await page.getByTestId("emotion-calibration-skip").click();

  for (let step = 0; step < 40 && (await selectedChoiceCount(page)) < 2; step += 1) {
    await revealAndChooseFirst(page);
  }
  expect(await selectedChoiceCount(page)).toBeGreaterThanOrEqual(2);

  for (let step = 0; step < 30; step += 1) {
    await page
      .getByTestId("story-copy")
      .click()
      .catch(() => undefined);
    const multiChoice = page.locator(".choice-button:not(.ai-choice-button)");
    if (
      (await multiChoice.count()) >= 2 &&
      (await multiChoice
        .first()
        .isVisible()
        .catch(() => false))
    ) {
      await multiChoice.first().click();
      break;
    }
    if (
      await multiChoice
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await multiChoice.first().click();
    }
  }

  await openPlayerPath(page);
  await expect(page.locator(".player-path-edge--selected").first()).toBeVisible();
  await expect(page.locator(".player-path-edge--available_unselected").first()).toBeVisible();
  await assertSentinelAbsent(page, consoleErrors);

  await page.screenshot({
    path: ".devspace-visual/player-path/desktop-1440x900.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("player-path-panel")).toBeVisible();
  await page.screenshot({
    path: ".devspace-visual/player-path/mobile-portrait-390x844.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByTestId("player-path-panel")).toBeVisible();
  await page.screenshot({
    path: ".devspace-visual/player-path/mobile-landscape-844x390.png",
    animations: "disabled",
  });

  await page.getByRole("tab", { name: "线性清单" }).click();
  await expect(page.getByTestId("player-path-linear")).toBeVisible();
  await expect(page.getByText(/实际选择/).first()).toBeVisible();
  await expect(page.getByText(/已见未选/).first()).toBeVisible();

  await page.getByRole("button", { name: "关闭" }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  const systemMenu = page.getByTestId("system-menu");
  if (!(await systemMenu.isVisible().catch(() => false))) {
    await page.getByTestId("system-menu-toggle").click({ force: true });
  }
  await page.getByTestId("save-button").click({ force: true });
  await expect(page.getByTestId("save-toast")).toBeVisible();

  await page.reload();
  await page.getByTestId("title-continue").click();
  await expect(page.getByTestId("game-viewport")).toBeVisible();
  await openPlayerPath(page);
  await expect(page.locator(".player-path-edge--selected").first()).toBeVisible();
  await expect(page.locator(".player-path-edge--available_unselected").first()).toBeVisible();
  await assertSentinelAbsent(page, consoleErrors);

  expect(pageErrors).toEqual([]);
  expect(networkFailures).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
