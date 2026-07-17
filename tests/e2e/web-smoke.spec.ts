import { expect, test } from "@playwright/test";

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

async function installSignedInSession(page: import("@playwright/test").Page) {
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
        tts: {
          providers: { elevenlabs: false, minimax: false },
          freeformEnabled: false,
        },
      }),
    }),
  );
  await page.route("**/tts/synthesize", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"error":"disabled_in_e2e"}',
    }),
  );
  await page.route("**/ai/branch", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"error":"disabled_in_e2e"}',
    }),
  );
  await page.route("**/api/choice-stats**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: '{"counts":{}}' }),
  );
}

/**
 * AI final-chapter e2e uses the short prototype fixture via dev story selector.
 * Draft package chapter ends intentionally do not open AI final chapter.
 */
async function reachPrototypeAiEnd(page: import("@playwright/test").Page) {
  await page.goto("/?debug=1");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.setItem("supaluv.boot.seen.v1", "1");
  });
  await page.reload();
  const interactiveBoot = page.locator('[data-testid="boot-splash"][role="button"]');
  if (await interactiveBoot.isVisible().catch(() => false)) {
    await interactiveBoot.click();
  }
  await expect(page.getByTestId("title-screen")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await page.getByTestId("title-new-game").click();
  await page.getByRole("button", { name: "使用官方形象" }).click();
  await page.getByRole("button", { name: "使用官方形象" }).click();
  await expect(page.getByTestId("game-viewport")).toBeVisible();
  await page.getByTestId("system-menu-toggle").click({ force: true });
  const devToggle = page.getByTestId("dev-tools-toggle");
  if (await devToggle.isVisible().catch(() => false)) {
    const label = (await devToggle.textContent()) ?? "";
    if (label.includes("开发工具") && !label.includes("隐藏")) {
      await devToggle.click({ force: true });
    }
  }
  await page.keyboard.press("Escape").catch(() => undefined);
  const selector = page.locator('select[aria-label="Story selector"]');
  await expect(selector).toBeVisible({ timeout: 10_000 });
  await selector.selectOption("prototype-act1");
  await expect(page.getByTestId("story-label")).toContainText(/Prototype|Comedy/i, {
    timeout: 10_000,
  });
  for (let step = 0; step < 120; step += 1) {
    if (
      await page
        .getByTestId("ending-ai-experience")
        .isVisible()
        .catch(() => false)
    )
      return;
    const storyCopy = page.getByTestId("story-copy");
    if (await storyCopy.isVisible().catch(() => false)) {
      await storyCopy.click();
    }
    const choice = page.locator(".choice-button:not(.ai-choice-button)").first();
    if (await choice.isVisible().catch(() => false)) await choice.click();
  }
  throw new Error("Prototype AI end was not reached within 120 authored actions");
}

async function clickIfVisible(page: import("@playwright/test").Page, name: RegExp) {
  // Authored choices expose a localized semantic aria-label prefix
  // (e.g. "剧情选择: 继续"), so exact text-only names no longer match alone.
  const button = page.getByRole("button", { name });
  await page
    .getByTestId("story-copy")
    .click()
    .catch(() => undefined);
  await expect(button.first()).toBeVisible({ timeout: 10_000 });
  await button.first().click();
}

async function startDebugStory(
  page: import("@playwright/test").Page,
  storyId: "draft-ch02" | "prototype-act1",
) {
  await page.goto("/?debug=1");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.setItem("supaluv.boot.seen.v1", "1");
  });
  await page.reload();
  const interactiveBoot = page.locator('[data-testid="boot-splash"][role="button"]');
  if (await interactiveBoot.isVisible().catch(() => false)) {
    await interactiveBoot.click();
  }
  await expect(page.getByTestId("title-screen")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await page.getByTestId("title-new-game").click();
  await page.getByRole("button", { name: "使用官方形象" }).click();
  await page.getByRole("button", { name: "使用官方形象" }).click();
  await expect(page.getByTestId("game-viewport")).toBeVisible();
  await page.getByTestId("system-menu-toggle").click({ force: true });
  const devToggle = page.getByTestId("dev-tools-toggle");
  if (await devToggle.isVisible().catch(() => false)) {
    const label = (await devToggle.textContent()) ?? "";
    if (label.includes("开发工具") && !label.includes("隐藏")) {
      await devToggle.click({ force: true });
    }
  }
  await page.keyboard.press("Escape").catch(() => undefined);
  const selector = page.locator('select[aria-label="Story selector"]');
  await expect(selector).toBeVisible({ timeout: 10_000 });
  await selector.selectOption(storyId);
}

async function dismissPropCutInIfVisible(page: import("@playwright/test").Page) {
  const close = page.getByTestId("prop-cutin-close");
  if (await close.isVisible().catch(() => false)) {
    await close.click();
    await expect(page.getByTestId("prop-cutin-dialog")).toHaveCount(0);
    return true;
  }
  return false;
}

async function reachDraftChapterEnd(page: import("@playwright/test").Page) {
  await startDebugStory(page, "draft-ch02");
  const skipTestIds = [
    "barcode-sweep-skip",
    "housing-hotspots-skip",
    "mobile-questionnaire-skip",
  ] as const;

  for (let step = 0; step < 420; step += 1) {
    if (
      await page
        .getByTestId("ending-global-echo")
        .isVisible()
        .catch(() => false)
    ) {
      return;
    }

    // A first-visit prop cut-in pauses playback until the player closes it.
    if (await dismissPropCutInIfVisible(page)) {
      continue;
    }

    let skipped = false;
    for (const testId of skipTestIds) {
      const skip = page.getByTestId(testId);
      if (await skip.isVisible().catch(() => false)) {
        skipped = true;
        if (await skip.isEnabled().catch(() => false)) {
          await skip.click();
        } else {
          await page.waitForTimeout(25);
        }
        break;
      }
    }
    if (skipped) {
      continue;
    }

    const storyCopy = page.getByTestId("story-copy");
    if (await storyCopy.isVisible().catch(() => false)) {
      await storyCopy.click({ force: true });
    }

    const authoredChoice = page.locator(".authored-choice-group .choice-button").first();
    if (await authoredChoice.isVisible().catch(() => false)) {
      await authoredChoice.click();
      continue;
    }
    await page.waitForTimeout(15);
  }
  throw new Error("Draft chapter end was not reached within 220 authored actions");
}

/** Matches visible "继续" and accessible name "剧情选择: 继续" / "Story choice: Continue". */
const CONTINUE_CHOICE = /(?:剧情选择|Story choice):\s*继续$|^继续$/i;

test("commercial shell: cinematic title, play, system save", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
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
  await page.route("**/tts/synthesize", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"error":"disabled_in_e2e"}',
    }),
  );
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
    const ageConfirm = page.getByTestId("age-gate-confirm");
    if (await ageConfirm.isVisible().catch(() => false)) {
      await ageConfirm.click();
    }
  }

  await expect(page.getByTestId("title-screen")).toBeVisible();
  await page.getByRole("button", { name: "中文" }).click();
  await expect(page.getByRole("heading", { name: "超级爱人" })).toBeVisible();
  // A fast double-click must not create two asynchronous story runtimes.
  await page.getByTestId("title-new-game").dblclick();

  await expect(page.getByTestId("character-studio")).toBeVisible();
  await page.getByRole("button", { name: "使用官方形象" }).click();
  await page.getByRole("button", { name: "使用官方形象" }).click();

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

  await expect(page.getByTestId("vn-stage")).toHaveAttribute("data-motion", "slow_push");
  await expect(page.getByTestId("cutscene-layer")).toHaveCount(0);

  await clickIfVisible(page, CONTINUE_CHOICE);
  await expect(page.getByTestId("emotion-calibration")).toBeVisible();
  await page.getByTestId("emotion-calibration-skip").click();
  await clickIfVisible(page, CONTINUE_CHOICE);
  // s002 protocol prose → first-visit prop cut-in → protocol-test interaction → s003 bones branch
  await clickIfVisible(page, CONTINUE_CHOICE);
  await expect(page.getByTestId("prop-cutin-dialog")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("prop-cutin-close").click();
  await expect(page.getByTestId("prop-cutin-dialog")).toHaveCount(0);
  await expect(page.getByTestId("protocol-test")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("protocol-test-skip").click();
  await clickIfVisible(page, CONTINUE_CHOICE);
  await page.getByTestId("story-copy").click();
  // First authored branch: protocol "bones" choice (ignore oracle guess buttons).
  await expect(
    page.locator(".choice-button", { hasText: /说人话了|后门也算诚实/ }).first(),
  ).toBeVisible({ timeout: 15_000 });

  await expect(page.getByTestId("oracle-instruction")).toHaveCount(0);
  await expect(page.getByTestId("oracle-row")).toHaveCount(0);
  await expect(page.getByTestId("authored-choice-lead")).toContainText("剧情选择");

  const authoredGroup = page.getByTestId("authored-choice-group");
  await expect(authoredGroup).toHaveAttribute("role", "group");
  await expect(authoredGroup).toHaveAttribute("aria-labelledby", "authored-choices-label");

  const firstAuthored = page.locator(".authored-choice-group .choice-button").first();
  const authoredAria = await firstAuthored.getAttribute("aria-label");
  expect(authoredAria).toMatch(/^剧情选择:/);
  await expect(page.locator(".oracle-buttons button")).toHaveCount(0);

  await page.setViewportSize({ width: 844, height: 390 });
  const narrowAuthoredChoice = page.locator(".choice-button:not(.ai-choice-button)").first();
  await narrowAuthoredChoice.scrollIntoViewIfNeeded();
  await expect(narrowAuthoredChoice).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
    false,
  );
  await page.setViewportSize({ width: 1280, height: 720 });

  const dialogue = page.getByTestId("dialogue-box");
  const box = await dialogue.boundingBox();
  expect(box && box.height > 140).toBeTruthy();

  // Free-form dialogue TTS is off by default: button exists but stays disabled (no 400 spam).
  const voiceButton = page.getByTestId("dialogue-voice-button");
  await expect(voiceButton).toBeVisible();
  await expect(voiceButton).toBeDisabled();
  await expect(voiceButton).toHaveAttribute(
    "title",
    /语音预算还在充电|Voice budget still charging/,
  );

  await page.getByTestId("history-toggle").click({ force: true });
  await expect(page.getByTestId("history-drawer")).toBeVisible();
  await page.getByRole("button", { name: "关闭" }).click({ force: true });

  await page.getByTestId("system-menu-toggle").click({ force: true });
  await expect(page.getByTestId("system-menu")).toBeVisible();
  await expect(page.getByTestId("dev-tools-toggle")).toHaveCount(0);
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

test("choice stats surfaces stay local-demo-only without authority", async ({ page }) => {
  test.setTimeout(90_000);
  await page.route("**/api/choice-stats**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: '{"ok":true}',
      });
      return;
    }
    const storyId = new URL(request.url()).searchParams.get("storyId") ?? "";
    const counts =
      storyId === "draft-ch02"
        ? {
            d2_catch_firm: 80,
            d2_catch_soft: 20,
            d2_admit_me: 65,
            d2_admit_me_hard: 35,
          }
        : {};
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        storyId,
        counts,
        source: "anonymous-memory-aggregate",
      }),
    });
  });

  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.setItem("supaluv.boot.seen.v1", "1");
  });
  await page.reload();
  await page.getByRole("button", { name: "中文", exact: true }).click();

  await page.getByTestId("title-help").click();
  await expect(page.getByTestId("help-screen")).toBeVisible();
  await expect(page.getByText("本地演示样本与分享", { exact: true })).toBeVisible();
  await expect(
    page.getByText("当前没有可信聚合，预言入口与统计裁判保持不可用。", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("本地演示样本里的多数/少数标签只用于看版式，不触发奖励。", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "返回", exact: true }).click();

  await page.getByTestId("title-achievements").click();
  await expect(page.getByTestId("achievements-screen")).toBeVisible();
  const achievementText = await page.getByTestId("achievements-screen").innerText();
  expect(achievementText).toContain("0 / 10");
  expect(achievementText).not.toMatch(/少数派回声|逆流订单|预言命中/);
  await page.getByRole("button", { name: "返回", exact: true }).click();

  await reachDraftChapterEnd(page);
  const echo = page.getByTestId("ending-global-echo");
  await expect(echo).toBeVisible();
  await expect(echo.getByRole("heading", { name: "本地演示样本" })).toBeVisible();
  // Local-demo ending copy varies with whether whitelist forks were visited.
  await expect(echo).toContainText(/本地演示样本/);
  const echoText = await echo.innerText();
  expect(echoText).not.toMatch(/全球|社区|玩家/);
  await expect(page.getByTestId("ending-oracle")).toHaveCount(0);
  await expect(page.getByTestId("unlock-toast")).toHaveCount(0);
});

test("settings expose only player-ready controls and copy", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.setItem("supaluv.boot.seen.v1", "1");
  });
  await page.reload();

  await page.getByRole("button", { name: "中文", exact: true }).click();
  await page.getByTestId("title-settings").click();
  await expect(page.getByTestId("settings-screen")).toBeVisible();
  await expect(page.getByTestId("settings-lang-zh-CN")).toBeVisible();
  await expect(page.getByTestId("settings-lang-en")).toBeVisible();
  await expect(page.locator('button[data-testid^="settings-lang-"]')).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "账号", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "游戏说明", exact: true })).toBeVisible();
  await expect(page.getByTestId("settings-tts-preview")).toHaveText("登录后可试听人物语音");

  const settingsText = (await page.getByTestId("settings-screen").innerText()).toLowerCase();
  for (const forbidden of [
    "provider",
    "webaudio",
    "minimax",
    "elevenlabs",
    "ink",
    "wip",
    "骨架",
    "后续接线",
    "swimmercore",
  ]) {
    expect(settingsText).not.toContain(forbidden);
  }
});

test("AI spend analysis explains that authored story is free", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.setItem("supaluv.boot.seen.v1", "1");
  });
  await page.reload();

  await page.getByRole("button", { name: "中文", exact: true }).click();
  await page.getByTestId("title-ai-spend").click();
  await expect(page.getByTestId("ai-spend-screen")).toBeVisible();
  await expect(page.getByText(/作者剧情完全免费|只有你主动使用 AI 功能/)).toBeVisible();
  await expect(page.getByText("需要登录")).toBeVisible();
});

test("AI spend analysis shows only committed labeled receipts", async ({ page }) => {
  await installSignedInSession(page);
  await page.route("**/api/ai/spend", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            id: "receipt-1",
            label: "生成角色基准形象",
            actionKind: "character_base",
            amountPowerUnits: 120,
            batteries: 1.2,
            scopeType: "character_pack",
            scopeId: "pack-1",
            metadata: {},
          },
          {
            id: "receipt-2",
            label: "推进 AI 最终章",
            actionKind: "ai_ending_segment",
            amountPowerUnits: 80,
            batteries: 0.8,
            scopeType: "ai_ending_session",
            scopeId: "ending-1",
            metadata: {},
          },
        ],
        groups: [],
        totalPowerUnits: 200,
        totalBatteries: 2,
      }),
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await page.getByTestId("title-ai-spend").click();

  await expect(page.getByTestId("ai-spend-total")).toHaveText("2");
  await expect(page.getByText("生成角色基准形象")).toBeVisible();
  await expect(page.getByText("推进 AI 最终章")).toBeVisible();
  await expect(page.getByText(/失败、拦截、退款和重复请求不会记账/)).toBeVisible();
});

test("landscape phone keeps casting controls reachable", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.setItem("supaluv.boot.seen.v1", "1");
  });
  await page.reload();
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await page.getByTestId("title-new-game").click();

  await expect(page.getByTestId("character-studio")).toBeVisible();
  const official = page.getByRole("button", { name: "使用官方形象" });
  await official.scrollIntoViewIfNeeded();
  await expect(official).toBeVisible();
});

test("AI ending accepts choices and free text, resumes, and terminates", async ({ page }) => {
  test.setTimeout(90_000);
  await installSignedInSession(page);
  const segments: Array<Record<string, unknown>> = [];
  const makeSegment = (sequence: number, terminal = false) => ({
    sequence,
    text: terminal ? "订单生成了，人也终于决定承担自己的选择。" : `最终章片段 ${sequence}`,
    beats: [`beat-${sequence}`],
    choices: terminal
      ? []
      : [
          { id: `choice-${sequence}-a`, label: "继续嘴硬", actionSummary: "嘴硬" },
          { id: `choice-${sequence}-b`, label: "承认害怕", actionSummary: "坦白" },
        ],
    terminal,
    ...(terminal ? { outcomeAnchor: "awkward_responsibility" } : {}),
  });
  await page.route("**/api/ai/endings/sessions**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/resume")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session: {
            id: "ending-session-1",
            currentVersion: segments.length,
            currentSequence: segments.length,
            status: "active",
          },
          checkpoints: segments.map((segment) => ({ segment })),
        }),
      });
      return;
    }
    const isAdvance = url.pathname.endsWith("/actions");
    const sequence = isAdvance ? segments.length + 1 : 1;
    const segment = makeSegment(sequence, sequence === 4);
    segments.push(segment);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        checkpoint: { sessionId: "ending-session-1", sessionVersion: sequence },
        segment,
        idempotent: false,
      }),
    });
  });

  await reachPrototypeAiEnd(page);
  await page.getByTestId("ending-ai-experience").click();
  await page.getByRole("button", { name: "开始我的最终章" }).click();
  await expect(page.getByText("最终章片段 1")).toBeVisible();
  await page.getByRole("button", { name: "继续嘴硬" }).click();
  await expect(page.getByText("最终章片段 2")).toBeVisible();
  await page.getByRole("textbox", { name: "自由行动" }).fill("把账单摊在桌上，先把话说清楚。 ");
  await page.getByRole("button", { name: "提交自由行动" }).click();
  await expect(page.getByText("最终章片段 3")).toBeVisible();

  await page.reload();
  await page.getByTestId("title-continue").click();
  await expect(page.getByTestId("ending-ai-experience")).toBeVisible();
  await page.getByTestId("ending-ai-experience").click();
  await page.getByRole("button", { name: "开始我的最终章" }).click();
  await expect(page.getByText("最终章片段 3")).toBeVisible();
  await page.getByRole("button", { name: "承认害怕" }).click();
  await expect(page.getByText("结局已生成")).toBeVisible();
  await expect(page.getByText(/awkward_responsibility/)).toBeVisible();
});
