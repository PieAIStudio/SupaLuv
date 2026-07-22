import { expect, test, type Page } from "@playwright/test";

const PATH_MEMORY_KEY = "supaluv.path-memory.v2";
const FUTURE_SENTINEL = "初审通过";

async function prepareNewGame(page: Page): Promise<void> {
  await page.route("**/api/ai/health", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        tts: {
          providers: { elevenlabs: false, minimax: false },
          freeformEnabled: false,
        },
      }),
    }),
  );
  await page.route("**/api/choice-stats**", (route) =>
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

async function dismissPropCutInIfVisible(page: Page): Promise<boolean> {
  const close = page.getByTestId("prop-cutin-close");
  if (await close.isVisible().catch(() => false)) {
    await close.click();
    await expect(page.getByTestId("prop-cutin-dialog")).toHaveCount(0);
    return true;
  }
  return false;
}

async function skipActiveStoryInteraction(page: Page): Promise<boolean> {
  const skips = [
    "emotion-calibration-skip",
    "protocol-test-skip",
    "barcode-sweep-skip",
    "housing-hotspots-skip",
    "mobile-questionnaire-skip",
  ] as const;
  for (const testId of skips) {
    const button = page.getByTestId(testId);
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      // Delayed Ink commit inside interaction chrome.
      await page.waitForTimeout(550);
      return true;
    }
  }
  return false;
}

async function revealAndChooseFirst(page: Page): Promise<boolean> {
  // A first-visit prop cut-in pauses playback until the player closes it.
  if (await dismissPropCutInIfVisible(page)) {
    return true;
  }
  if (await skipActiveStoryInteraction(page)) {
    return true;
  }
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
  await dismissPropCutInIfVisible(page);
  // After continue/restore, LoadingDwellCurtain (z-index 100, full viewport) can
  // still be up for LOADING_MIN_DWELL_MS. force:true would hit the curtain DIV
  // instead of the toggle and never open the menu — wait for the event anchor.
  await expect(page.getByTestId("loading-dwell-curtain")).toHaveCount(0);
  const systemMenu = page.getByTestId("system-menu");
  const toggle = page.getByTestId("system-menu-toggle");
  // Toggle is a binary open/close control — only click when the menu is closed.
  // Do not use force:true: actionability must wait until nothing intercepts hits.
  if (!(await systemMenu.isVisible().catch(() => false))) {
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  }
  await expect(systemMenu).toBeVisible();
  await expect(page.getByTestId("player-path-menu-button")).toBeVisible();
  await expect(page.getByTestId("creator-map-menu-button")).toHaveCount(0);
  await page.getByTestId("player-path-menu-button").click();
  await expect(page.getByTestId("player-path-panel")).toBeVisible();
}

async function assertPlayerPathKeyboardContract(page: Page): Promise<void> {
  const panel = page.getByTestId("player-path-panel");
  const close = page.getByRole("button", { name: "关闭" });
  await expect(close).toBeFocused();

  // Genuine modal: showModal() lifecycle — not open+aria-modal alone.
  await expect(panel).toHaveAttribute("data-modal-lifecycle", "showModal");
  const modalState = await panel.evaluate((element) => {
    const dialog = element as HTMLDialogElement;
    return {
      tagName: dialog.tagName,
      open: dialog.open,
      // HTMLDialogElement.matches(":modal") is true only for showModal() top-layer.
      isModal: dialog.matches(":modal"),
      hasOpenAttribute: dialog.hasAttribute("open"),
    };
  });
  expect(modalState).toMatchObject({
    tagName: "DIALOG",
    open: true,
    isModal: true,
  });

  // Background controls must not be keyboard-focusable while the modal is open.
  const backgroundFocusProof = await page.evaluate(() => {
    const toggle = document.querySelector<HTMLElement>('[data-testid="system-menu-toggle"]');
    const dialog = document.querySelector<HTMLDialogElement>('[data-testid="player-path-panel"]');
    if (!toggle || !dialog) {
      return { ok: false, reason: "missing-controls" };
    }
    toggle.focus();
    return {
      ok: true,
      activeIsInsideDialog: dialog.contains(document.activeElement),
      activeTestId: (document.activeElement as HTMLElement | null)?.dataset?.testid ?? null,
      dialogIsModal: dialog.matches(":modal"),
    };
  });
  expect(backgroundFocusProof.ok).toBe(true);
  expect(backgroundFocusProof.dialogIsModal).toBe(true);
  // showModal() inert-ifies the rest of the document; focus stays in the dialog.
  expect(backgroundFocusProof.activeIsInsideDialog).toBe(true);

  // WAI-ARIA Tabs: ArrowLeft/Right (wrap), Home, End, roving tabindex, selected state.
  const journeyTab = page.getByRole("tab", { name: "路线回顾" });
  const graphTab = page.getByRole("tab", { name: "图形视图" });
  await journeyTab.focus();
  await expect(journeyTab).toBeFocused();
  await expect(journeyTab).toHaveAttribute("aria-selected", "true");
  await expect(journeyTab).toHaveAttribute("tabindex", "0");
  await expect(graphTab).toHaveAttribute("tabindex", "-1");

  await page.keyboard.press("ArrowRight");
  await expect(graphTab).toBeFocused();
  await expect(graphTab).toHaveAttribute("aria-selected", "true");
  await expect(graphTab).toHaveAttribute("tabindex", "0");
  await expect(journeyTab).toHaveAttribute("aria-selected", "false");
  await expect(journeyTab).toHaveAttribute("tabindex", "-1");
  await expect(page.getByTestId("player-path-graph")).toBeVisible();
  await expect(page.getByTestId("player-path-journey")).toBeHidden();

  await page.keyboard.press("ArrowRight"); // wrap to journey
  await expect(journeyTab).toBeFocused();
  await expect(journeyTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("player-path-journey")).toBeVisible();

  await page.keyboard.press("End");
  await expect(graphTab).toBeFocused();
  await expect(graphTab).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(journeyTab).toBeFocused();
  await expect(journeyTab).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowLeft"); // wrap to graph
  await expect(graphTab).toBeFocused();
  await expect(graphTab).toHaveAttribute("aria-selected", "true");

  // tabpanel relationship
  await expect(graphTab).toHaveAttribute("aria-controls", "player-path-graph-panel");
  await expect(page.getByTestId("player-path-graph")).toHaveAttribute(
    "aria-labelledby",
    "player-path-graph-tab",
  );

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(page.getByTestId("system-menu-toggle")).toBeFocused();
}

async function assertPlayerPathViewportContract(page: Page): Promise<void> {
  const geometry = await page.getByTestId("player-path-panel").evaluate((panel) => {
    const content = panel.querySelector<HTMLElement>(".player-path-content");
    const journey = panel.querySelector<HTMLElement>(".player-path-journey:not(.is-hidden)");
    const detail = panel.querySelector<HTMLElement>(".player-path-detail");
    const close = panel.querySelector<HTMLElement>(".player-path-close");
    if (!content || !journey || !detail || !close) {
      throw new Error("Player Path geometry targets missing");
    }
    const rect = (element: Element) => {
      const value = element.getBoundingClientRect();
      return {
        top: value.top,
        right: value.right,
        bottom: value.bottom,
        left: value.left,
        width: value.width,
        height: value.height,
      };
    };
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      panel: rect(panel),
      content: rect(content),
      journey: rect(journey),
      detail: rect(detail),
      close: rect(close),
      contentScrollWidth: content.scrollWidth,
      contentClientWidth: content.clientWidth,
      contentScrollHeight: content.scrollHeight,
      contentClientHeight: content.clientHeight,
      contentOverflowY: getComputedStyle(content).overflowY,
      contentDisplay: getComputedStyle(content).display,
    };
  });

  expect(geometry.panel.left).toBeGreaterThanOrEqual(-1);
  expect(geometry.panel.top).toBeGreaterThanOrEqual(-1);
  expect(geometry.panel.right).toBeLessThanOrEqual(geometry.viewport.width + 1);
  expect(geometry.panel.bottom).toBeLessThanOrEqual(geometry.viewport.height + 1);
  expect(geometry.close.left).toBeGreaterThanOrEqual(0);
  expect(geometry.close.top).toBeGreaterThanOrEqual(0);
  expect(geometry.close.right).toBeLessThanOrEqual(geometry.viewport.width);
  expect(geometry.close.bottom).toBeLessThanOrEqual(geometry.viewport.height);
  expect(geometry.contentScrollWidth).toBeLessThanOrEqual(geometry.contentClientWidth + 1);
  expect(geometry.journey.width).toBeGreaterThan(0);
  expect(geometry.detail.width).toBeGreaterThan(0);

  if (geometry.contentDisplay === "block") {
    expect(geometry.contentOverflowY).toBe("auto");
    expect(geometry.detail.top).toBeGreaterThanOrEqual(geometry.journey.bottom - 1);
    expect(geometry.contentScrollHeight).toBeGreaterThanOrEqual(geometry.contentClientHeight);
  } else {
    expect(geometry.journey.right).toBeLessThanOrEqual(geometry.detail.left + 1);
  }
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
  await page.waitForTimeout(550);

  for (let step = 0; step < 40 && (await selectedChoiceCount(page)) < 2; step += 1) {
    await revealAndChooseFirst(page);
  }
  expect(await selectedChoiceCount(page)).toBeGreaterThanOrEqual(2);

  for (let step = 0; step < 40; step += 1) {
    if (await dismissPropCutInIfVisible(page)) {
      continue;
    }
    if (await skipActiveStoryInteraction(page)) {
      continue;
    }
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
  await assertPlayerPathKeyboardContract(page);
  await openPlayerPath(page);
  await expect(page.getByTestId("player-path-journey")).toBeVisible();

  const accessibleLongText = await page
    .locator(".player-path-journey button")
    .first()
    .evaluate((button) => ({
      aria: button.getAttribute("aria-label") ?? "",
      clamped: Array.from(button.querySelectorAll<HTMLElement>(".player-path-clamped")).map(
        (element) => ({ text: element.textContent?.trim() ?? "", title: element.title }),
      ),
    }));
  expect(accessibleLongText.aria.length).toBeGreaterThan(0);
  expect(accessibleLongText.clamped.length).toBeGreaterThan(0);
  expect(
    accessibleLongText.clamped.every(({ text, title }) => title.length > 0 && title === text),
  ).toBe(true);

  await page.getByRole("tab", { name: "图形视图" }).click();
  await expect(page.locator(".player-path-edge--selected").first()).toBeVisible();
  await expect(page.locator(".player-path-edge--available_unselected").first()).toBeVisible();
  await assertSentinelAbsent(page, consoleErrors);
  await page.getByRole("tab", { name: "路线回顾" }).click();
  await expect(page.getByTestId("player-path-journey")).toBeVisible();
  await assertPlayerPathViewportContract(page);

  await page.screenshot({
    path: ".devspace-visual/player-path/desktop-1440x900.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("player-path-panel")).toBeVisible();
  await assertPlayerPathViewportContract(page);
  await page.screenshot({
    path: ".devspace-visual/player-path/mobile-portrait-390x844.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByTestId("player-path-panel")).toBeVisible();
  await assertPlayerPathViewportContract(page);
  await page.screenshot({
    path: ".devspace-visual/player-path/mobile-landscape-844x390.png",
    animations: "disabled",
  });

  await expect(page.getByTestId("player-path-journey")).toBeVisible();
  await expect(page.getByText(/实际选择/).first()).toBeVisible();
  await expect(page.getByText(/已见未选/).first()).toBeVisible();

  await page.getByRole("button", { name: "关闭" }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByTestId("loading-dwell-curtain")).toHaveCount(0);
  const systemMenu = page.getByTestId("system-menu");
  if (!(await systemMenu.isVisible().catch(() => false))) {
    await page.getByTestId("system-menu-toggle").click();
  }
  await page.getByTestId("save-button").click();
  await expect(page.getByTestId("save-toast")).toBeVisible();

  await page.reload();
  await page.getByTestId("title-continue").click();
  await expect(page.getByTestId("game-viewport")).toBeVisible();
  // openPlayerPath waits for loading-dwell-curtain (post-continue min dwell).
  await openPlayerPath(page);
  await page.getByRole("tab", { name: "图形视图" }).click();
  await expect(page.locator(".player-path-edge--selected").first()).toBeVisible();
  await expect(page.locator(".player-path-edge--available_unselected").first()).toBeVisible();
  await assertSentinelAbsent(page, consoleErrors);

  expect(pageErrors).toEqual([]);
  expect(networkFailures).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
