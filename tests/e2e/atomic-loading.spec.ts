import { mkdir, writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const evidenceDir = ".devspace-visual/atomic-loading/e2e";
const THRESHOLD_PROBE_MS = 250;
const THRESHOLD_MS = 400;
const TITLE_ASSET_DELAY_MS = 1_100;
const CASTING_ASSET_DELAY_MS = 1_200;

type FrameSample = {
  at: number;
  boot: boolean;
  title: boolean;
  studio: boolean;
  game: boolean;
  loading: string[];
};

async function resetToTitle(page: import("@playwright/test").Page, query = "") {
  await page.goto(`/${query}`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByTestId("boot-splash").click();
  await expect(page.getByTestId("title-screen")).toBeVisible();
}

function isBenignNavigationAbort(request: import("@playwright/test").Request): boolean {
  const failure = request.failure();
  const errorText = failure?.errorText ?? "";
  // Reload/navigation aborts in-flight module, media, and document requests from the
  // previous document. Those are not product load failures after recovery.
  return (
    errorText === "net::ERR_ABORTED" ||
    errorText === "NS_BINDING_ABORTED" ||
    errorText.toLowerCase().includes("aborted")
  );
}

function observePageIssues(page: import("@playwright/test").Page) {
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const abortedRequests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    if (isBenignNavigationAbort(request)) {
      abortedRequests.push(request.url());
      return;
    }
    failedRequests.push(request.url());
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  return { pageErrors, failedRequests, abortedRequests, consoleErrors };
}

async function addLoadingTrace(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const testWindow = window as Window & {
      __SUPALUV_LOADING_TRACE__?: Array<{ testId: string; at: number }>;
    };
    testWindow.__SUPALUV_LOADING_TRACE__ = [];
    const seen = new WeakSet<Element>();
    const scan = () => {
      document.querySelectorAll<HTMLElement>('[data-testid^="atomic-loading-"]').forEach((node) => {
        if (seen.has(node)) {
          return;
        }
        seen.add(node);
        testWindow.__SUPALUV_LOADING_TRACE__?.push({
          testId: node.dataset.testid ?? "unknown",
          at: performance.now(),
        });
      });
    };
    const install = () => {
      if (!document.documentElement) {
        return;
      }
      const observer = new MutationObserver(scan);
      observer.observe(document.documentElement, { childList: true, subtree: true });
      scan();
    };
    if (document.documentElement) {
      install();
    } else {
      window.addEventListener("DOMContentLoaded", install, { once: true });
    }
  });
}

/**
 * In-page frame sampler: records previous-frame + overlay presence on a short interval.
 * Threshold assertions must use these samples — Playwright's auto-waiting expects can
 * miss a 400ms window or accidentally wait through overlay mount/unmount.
 */
async function addFrameSampler(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    type Sample = {
      at: number;
      boot: boolean;
      title: boolean;
      studio: boolean;
      game: boolean;
      loading: string[];
    };
    const testWindow = window as Window & {
      __SUPALUV_FRAME_SAMPLES__?: Sample[];
      __SUPALUV_SAMPLE_ORIGIN__?: number | null;
      __SUPALUV_SAMPLE_TIMER__?: number | null;
      __SUPALUV_START_SAMPLING__?: (origin?: number) => number;
      __SUPALUV_STOP_SAMPLING__?: () => Sample[];
    };

    const takeSample = (): Sample => ({
      at:
        testWindow.__SUPALUV_SAMPLE_ORIGIN__ == null
          ? performance.now()
          : performance.now() - testWindow.__SUPALUV_SAMPLE_ORIGIN__,
      boot: Boolean(document.querySelector('[data-testid="boot-splash"]')),
      title: Boolean(document.querySelector('[data-testid="title-screen"]')),
      studio: Boolean(document.querySelector('[data-testid="character-studio"]')),
      game: Boolean(document.querySelector('[data-testid="game-viewport"]')),
      loading: [...document.querySelectorAll<HTMLElement>('[data-testid^="atomic-loading-"]')]
        .map((node) => node.dataset.testid ?? "")
        .filter(Boolean),
    });

    testWindow.__SUPALUV_FRAME_SAMPLES__ = [];
    testWindow.__SUPALUV_SAMPLE_ORIGIN__ = null;
    testWindow.__SUPALUV_SAMPLE_TIMER__ = null;

    testWindow.__SUPALUV_START_SAMPLING__ = (origin = performance.now()) => {
      testWindow.__SUPALUV_SAMPLE_ORIGIN__ = origin;
      testWindow.__SUPALUV_FRAME_SAMPLES__ = [];
      if (testWindow.__SUPALUV_SAMPLE_TIMER__ != null) {
        window.clearInterval(testWindow.__SUPALUV_SAMPLE_TIMER__);
      }
      testWindow.__SUPALUV_FRAME_SAMPLES__.push(takeSample());
      testWindow.__SUPALUV_SAMPLE_TIMER__ = window.setInterval(() => {
        testWindow.__SUPALUV_FRAME_SAMPLES__?.push(takeSample());
      }, 25);
      return origin;
    };

    testWindow.__SUPALUV_STOP_SAMPLING__ = () => {
      if (testWindow.__SUPALUV_SAMPLE_TIMER__ != null) {
        window.clearInterval(testWindow.__SUPALUV_SAMPLE_TIMER__);
        testWindow.__SUPALUV_SAMPLE_TIMER__ = null;
      }
      testWindow.__SUPALUV_FRAME_SAMPLES__?.push(takeSample());
      return testWindow.__SUPALUV_FRAME_SAMPLES__ ?? [];
    };
  });
}

async function startSampling(page: import("@playwright/test").Page, origin?: number) {
  return page.evaluate((sampleOrigin) => {
    const testWindow = window as Window & {
      __SUPALUV_START_SAMPLING__?: (origin?: number) => number;
    };
    if (!testWindow.__SUPALUV_START_SAMPLING__) {
      throw new Error("frame sampler is not installed");
    }
    return testWindow.__SUPALUV_START_SAMPLING__(sampleOrigin);
  }, origin);
}

async function stopSampling(page: import("@playwright/test").Page): Promise<FrameSample[]> {
  return page.evaluate(() => {
    const testWindow = window as Window & {
      __SUPALUV_STOP_SAMPLING__?: () => FrameSample[];
    };
    if (!testWindow.__SUPALUV_STOP_SAMPLING__) {
      throw new Error("frame sampler is not installed");
    }
    return testWindow.__SUPALUV_STOP_SAMPLING__();
  });
}

function loadingKinds(sample: FrameSample, kind: string): boolean {
  return sample.loading.includes(`atomic-loading-${kind}`);
}

/**
 * Prove: under-threshold samples keep the previous frame and do not mount the
 * delayed overlay; some later sample mounts the overlay while the previous frame
 * still remains.
 */
function assertThresholdSamples(args: {
  samples: FrameSample[];
  kind: "title" | "casting" | "chapter";
  previous: "boot" | "title" | "game";
  probeMs?: number;
  thresholdMs?: number;
}) {
  const probeMs = args.probeMs ?? THRESHOLD_PROBE_MS;
  const thresholdMs = args.thresholdMs ?? THRESHOLD_MS;
  const samples = args.samples;
  expect(samples.length).toBeGreaterThan(5);

  const under = samples.filter((sample) => sample.at <= probeMs);
  expect(under.length).toBeGreaterThan(0);
  for (const sample of under) {
    expect(loadingKinds(sample, args.kind)).toBe(false);
    if (args.previous === "boot") {
      expect(sample.boot).toBe(true);
      expect(sample.title).toBe(false);
    } else if (args.previous === "title") {
      expect(sample.title).toBe(true);
    } else {
      expect(sample.game).toBe(true);
    }
  }

  const overlayWithPrevious = samples.find((sample) => {
    if (!loadingKinds(sample, args.kind) || sample.at < thresholdMs) {
      return false;
    }
    if (args.previous === "boot") {
      return sample.boot;
    }
    if (args.previous === "title") {
      return sample.title;
    }
    return sample.game;
  });
  expect(overlayWithPrevious).toBeTruthy();
  expect(overlayWithPrevious!.at).toBeGreaterThanOrEqual(thresholdMs);

  return {
    firstOverlayAt: overlayWithPrevious!.at,
    underCount: under.length,
  };
}

async function resetLoadingTrace(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    const testWindow = window as Window & {
      __SUPALUV_LOADING_TRACE__?: Array<{ testId: string; at: number }>;
    };
    testWindow.__SUPALUV_LOADING_TRACE__ = [];
  });
}

async function readLoadingTrace(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const testWindow = window as Window & {
      __SUPALUV_LOADING_TRACE__?: Array<{ testId: string; at: number }>;
    };
    return testWindow.__SUPALUV_LOADING_TRACE__ ?? [];
  });
}

async function disableHttpCache(page: import("@playwright/test").Page) {
  const session = await page.context().newCDPSession(page);
  await session.send("Network.enable");
  await session.send("Network.setCacheDisabled", { cacheDisabled: true });
}

/**
 * Force a minimum network latency for matching assets.
 * Using fetch+fulfill (instead of delay-then-continue) keeps the delay even when
 * the browser would otherwise serve a memory/disk-cached response immediately.
 */
async function delayAssetRoute(
  page: import("@playwright/test").Page,
  urlGlob: string,
  delayMs: number,
  onHit?: (url: string) => void,
) {
  await page.route(urlGlob, async (route) => {
    onHit?.(route.request().url());
    const response = await route.fetch();
    const body = await response.body();
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({
      status: response.status(),
      headers: response.headers(),
      body,
    });
  });
}

test.beforeAll(async () => {
  await mkdir(evidenceDir, { recursive: true });
});

test("returning session waits for a decoded title composition", async ({ page }) => {
  const { pageErrors, failedRequests, abortedRequests, consoleErrors } = observePageIssues(page);
  await addLoadingTrace(page);
  await addFrameSampler(page);
  await disableHttpCache(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://us-assets.i.posthog.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: "" }),
  );
  const titleAssetHits: string[] = [];
  await delayAssetRoute(page, "**/assets/scenes/bg-office-night.jpg", TITLE_ASSET_DELAY_MS, (url) => {
    titleAssetHits.push(url);
  });
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.setItem("supaluv.boot.seen.v1", "1");
    // Start sampling at the earliest document moment so the origin is before React
    // mounts the returning-session boot retention path.
    const testWindow = window as Window & {
      __SUPALUV_START_SAMPLING__?: (origin?: number) => number;
    };
    const start = () => testWindow.__SUPALUV_START_SAMPLING__?.(performance.now());
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => start(), { once: true });
    } else {
      start();
    }
  });

  // DomContentLoaded — not full load — so route-delayed critical assets remain
  // in flight while threshold samples are collected.
  const startedAt = Date.now();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const boot = page.getByTestId("boot-splash");
  await expect(boot).toBeVisible();
  await expect(boot).toHaveAttribute("data-busy", "true");

  const transition = page.getByTestId("atomic-loading-title");
  await expect(transition).toBeVisible({ timeout: 5_000 });
  const transitionVisibleAt = Date.now();
  await expect(page.getByTestId("title-screen")).toHaveCount(0);
  await expect(boot).toBeVisible();
  const dossierTitle = transition.getByTestId("atomic-loading-dossier").locator("h3");
  const firstDossierTitle = await dossierTitle.textContent();
  const nextDossier = transition.getByRole("button", { name: "换一份档案" });
  await nextDossier.focus();
  await page.keyboard.press("Enter");
  await expect(dossierTitle).not.toHaveText(firstDossierTitle ?? "");
  expect(
    await transition
      .locator(".atomic-loading-meter span")
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe("none");
  await page.screenshot({ path: `${evidenceDir}/title-first-load-transition.png` });
  await expect(page.getByTestId("title-screen")).toBeVisible({ timeout: 10_000 });
  const titleReadyAt = Date.now();
  await expect(transition).toHaveCount(0);
  await page.screenshot({ path: `${evidenceDir}/title-first-load-ready.png` });
  const samples = await stopSampling(page);
  const loadingTrace = await readLoadingTrace(page);
  // Re-base samples so origin is the first busy-boot frame (loading retention start),
  // not document DCL — React may mount tens of ms later.
  const firstBusyBoot = samples.find((sample) => sample.boot);
  expect(firstBusyBoot).toBeTruthy();
  const rebased = samples
    .filter((sample) => sample.at >= (firstBusyBoot?.at ?? 0))
    .map((sample) => ({ ...sample, at: sample.at - (firstBusyBoot?.at ?? 0) }));
  const thresholdStats = assertThresholdSamples({
    samples: rebased,
    kind: "title",
    previous: "boot",
  });
  const thresholdHeldAt = startedAt + thresholdStats.firstOverlayAt;

  await writeFile(
    `${evidenceDir}/title-first-load-timing.json`,
    JSON.stringify(
      {
        startedAt,
        thresholdHeldAt,
        transitionVisibleAt,
        titleReadyAt,
        thresholdHoldMs: THRESHOLD_PROBE_MS,
        feedbackLatencyMs: thresholdStats.firstOverlayAt,
        transitionDurationMs: titleReadyAt - transitionVisibleAt,
        titleAssetHits,
        thresholdStats,
        sampleCount: samples.length,
        loadingTrace,
        consoleErrors,
        pageErrors,
        failedRequests,
        abortedRequests,
      },
      null,
      2,
    ),
  );

  expect(titleAssetHits.length).toBeGreaterThan(0);
  expect(thresholdStats.firstOverlayAt).toBeGreaterThanOrEqual(THRESHOLD_MS);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(loadingTrace.some((entry) => entry.testId === "atomic-loading-title")).toBe(true);
});

test("new game shows a complete transition until casting is ready", async ({ page }) => {
  const { pageErrors, failedRequests, abortedRequests, consoleErrors } = observePageIssues(page);
  await addLoadingTrace(page);
  await addFrameSampler(page);
  await disableHttpCache(page);
  const portraitRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/assets\/portraits\/(suming-base|zhou-neutral)\.png/.test(request.url())) {
      portraitRequests.push(request.url());
    }
  });
  await page.route("https://us-assets.i.posthog.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: "" }),
  );
  const delayedPortraitHits: string[] = [];
  await delayAssetRoute(page, "**/assets/portraits/*.png", CASTING_ASSET_DELAY_MS, (url) => {
    delayedPortraitHits.push(url);
  });

  await resetToTitle(page);
  await page.waitForTimeout(700);
  expect(portraitRequests).toEqual([]);
  failedRequests.length = 0;
  abortedRequests.length = 0;
  await resetLoadingTrace(page);
  await page.screenshot({ path: `${evidenceDir}/title-desktop.png` });

  const title = page.getByTestId("title-screen");
  const transition = page.getByTestId("atomic-loading-casting");
  const newGame = page.getByTestId("title-new-game");
  await expect(title).toBeVisible();
  await expect(newGame).toBeEnabled();

  // Start sampling at the same moment the click is dispatched so threshold
  // origin matches the casting transition trigger, not Playwright setup latency.
  const clickedAt = Date.now();
  await page.evaluate(() => {
    const testWindow = window as Window & {
      __SUPALUV_START_SAMPLING__?: (origin?: number) => number;
    };
    const button = document.querySelector<HTMLElement>('[data-testid="title-new-game"]');
    if (!button || !testWindow.__SUPALUV_START_SAMPLING__) {
      throw new Error("casting threshold trigger is unavailable");
    }
    const origin = performance.now();
    testWindow.__SUPALUV_START_SAMPLING__(origin);
    button.click();
  });

  await expect(transition).toBeVisible({ timeout: 5_000 });
  const transitionVisibleAt = Date.now();
  await expect(transition).toContainText("正在打开选角工作台");
  await expect(title).toBeVisible();
  const transitionBox = await transition.boundingBox();
  const viewport = page.viewportSize();
  expect(transitionBox?.width).toBe(viewport?.width);
  expect(transitionBox?.height).toBe(viewport?.height);
  await page.screenshot({ path: `${evidenceDir}/new-game-transition.png` });
  await expect(page.getByTestId("character-studio")).toBeVisible({ timeout: 10_000 });
  const castingReadyAt = Date.now();
  await expect(page.getByTestId("atomic-loading-casting")).toHaveCount(0);
  await page.screenshot({ path: `${evidenceDir}/casting-ready.png` });
  const samples = await stopSampling(page);
  const loadingTrace = await readLoadingTrace(page);
  const thresholdStats = assertThresholdSamples({
    samples,
    kind: "casting",
    previous: "title",
  });
  const thresholdHeldAt = clickedAt + THRESHOLD_PROBE_MS;

  await writeFile(
    `${evidenceDir}/new-game-timing.json`,
    JSON.stringify(
      {
        clickedAt,
        thresholdHeldAt,
        transitionVisibleAt,
        castingReadyAt,
        thresholdHoldMs: THRESHOLD_PROBE_MS,
        feedbackLatencyMs: thresholdStats.firstOverlayAt,
        transitionDurationMs: castingReadyAt - transitionVisibleAt,
        loadingTrace,
        thresholdStats,
        sampleCount: samples.length,
        consoleErrors,
        pageErrors,
        failedRequests,
        abortedRequests,
        portraitRequests,
        delayedPortraitHits,
      },
      null,
      2,
    ),
  );

  expect(delayedPortraitHits.length).toBeGreaterThan(0);
  expect(thresholdStats.firstOverlayAt).toBeGreaterThanOrEqual(THRESHOLD_MS);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});

test("warm cache reaches casting without mounting a loading composition", async ({ page }) => {
  const { pageErrors, failedRequests, abortedRequests, consoleErrors } = observePageIssues(page);
  await addLoadingTrace(page);
  await page.route("https://us-assets.i.posthog.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: "" }),
  );

  await resetToTitle(page);
  await page.waitForTimeout(700);
  await page.evaluate(async () => {
    await Promise.all(
      ["/assets/portraits/suming-base.png", "/assets/portraits/zhou-neutral.png"].map(
        (src) =>
          new Promise<void>((resolve, reject) => {
            const image = new Image();
            image.onload = () => void image.decode().then(resolve, reject);
            image.onerror = () => reject(new Error(`warm-cache preload failed: ${src}`));
            image.src = src;
          }),
      ),
    );
  });
  failedRequests.length = 0;
  abortedRequests.length = 0;
  await resetLoadingTrace(page);

  const clickedAt = Date.now();
  await page.getByTestId("title-new-game").click();
  await expect(page.getByTestId("character-studio")).toBeVisible({ timeout: 3_000 });
  const castingReadyAt = Date.now();
  const loadingTrace = await readLoadingTrace(page);
  await page.screenshot({ path: `${evidenceDir}/casting-warm-cache-ready.png` });

  await writeFile(
    `${evidenceDir}/warm-cache-timing.json`,
    JSON.stringify(
      {
        clickedAt,
        castingReadyAt,
        transitionDurationMs: castingReadyAt - clickedAt,
        loadingTrace,
        consoleErrors,
        pageErrors,
        failedRequests,
        abortedRequests,
      },
      null,
      2,
    ),
  );

  expect(loadingTrace.some((entry) => entry.testId === "atomic-loading-casting")).toBe(false);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});

test("deterministic fixture proves an atomic chapter transition", async ({ page }) => {
  const { pageErrors, failedRequests, abortedRequests, consoleErrors } = observePageIssues(page);
  await addLoadingTrace(page);
  await addFrameSampler(page);
  await disableHttpCache(page);
  // Keep continue-after-delay for story modules: fetch+fulfill can break Vite ESM
  // content-type/transform expectations on dynamic chapter imports.
  await page.route("**/*draft-ch02*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    await route.continue();
  });

  await resetToTitle(page, "?atomic-loading-fixture=1");
  await page.getByTestId("title-new-game").click();
  await page.getByRole("button", { name: "使用官方形象" }).click();
  await page.getByRole("button", { name: "使用官方形象" }).click();
  await expect(page.getByTestId("game-viewport")).toBeVisible({ timeout: 15_000 });
  failedRequests.length = 0;
  abortedRequests.length = 0;
  await resetLoadingTrace(page);

  const viewport = page.getByTestId("game-viewport");
  const transition = page.getByTestId("atomic-loading-chapter");
  const triggeredAt = Date.now();
  await page.evaluate(() => {
    const testWindow = window as Window & {
      __SUPALUV_START_SAMPLING__?: (origin?: number) => number;
      __SUPALUV_ATOMIC_LOADING_TEST__?: {
        transitionToChapter1: () => void;
        transitionToChapter2: () => void;
      };
    };
    const fixture = testWindow.__SUPALUV_ATOMIC_LOADING_TEST__;
    if (!fixture || !testWindow.__SUPALUV_START_SAMPLING__) {
      throw new Error("atomic loading fixture is unavailable");
    }
    const origin = performance.now();
    testWindow.__SUPALUV_START_SAMPLING__(origin);
    fixture.transitionToChapter2();
  });

  await expect(viewport).toBeVisible();
  await expect(page.getByTestId("story-label")).toContainText(/第一章|你有病吧/);
  await expect(transition).toBeVisible({ timeout: 5_000 });
  const transitionVisibleAt = Date.now();
  await expect(viewport).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/chapter-transition.png` });
  await expect(transition).toHaveCount(0, { timeout: 15_000 });
  const chapterReadyAt = Date.now();
  await expect(page.getByTestId("story-label")).toContainText(/第二章|她不会评判你/);
  await page.screenshot({ path: `${evidenceDir}/chapter-02-ready.png` });
  const samples = await stopSampling(page);
  const slowLoadingTrace = await readLoadingTrace(page);
  const thresholdStats = assertThresholdSamples({
    samples,
    kind: "chapter",
    previous: "game",
  });
  const thresholdHeldAt = triggeredAt + THRESHOLD_PROBE_MS;

  await resetLoadingTrace(page);
  const warmSequenceStartedAt = Date.now();
  await page.evaluate(() => {
    const fixture = (
      window as Window & {
        __SUPALUV_ATOMIC_LOADING_TEST__?: {
          transitionToChapter1: () => void;
          transitionToChapter2: () => void;
        };
      }
    ).__SUPALUV_ATOMIC_LOADING_TEST__;
    if (!fixture) {
      throw new Error("atomic loading fixture is unavailable");
    }
    fixture.transitionToChapter1();
  });
  await expect(page.getByTestId("story-label")).toContainText(/第一章|你有病吧/, {
    timeout: 3_000,
  });
  await page.evaluate(() => {
    const fixture = (
      window as Window & {
        __SUPALUV_ATOMIC_LOADING_TEST__?: {
          transitionToChapter1: () => void;
          transitionToChapter2: () => void;
        };
      }
    ).__SUPALUV_ATOMIC_LOADING_TEST__;
    if (!fixture) {
      throw new Error("atomic loading fixture is unavailable");
    }
    fixture.transitionToChapter2();
  });
  await expect(page.getByTestId("story-label")).toContainText(/第二章|她不会评判你/, {
    timeout: 3_000,
  });
  const warmSequenceReadyAt = Date.now();
  const warmLoadingTrace = await readLoadingTrace(page);
  await page.screenshot({ path: `${evidenceDir}/chapter-warm-sequence-ready.png` });

  await writeFile(
    `${evidenceDir}/chapter-timing.json`,
    JSON.stringify(
      {
        triggeredAt,
        thresholdHeldAt,
        transitionVisibleAt,
        chapterReadyAt,
        thresholdHoldMs: THRESHOLD_PROBE_MS,
        feedbackLatencyMs: thresholdStats.firstOverlayAt,
        transitionDurationMs: chapterReadyAt - transitionVisibleAt,
        slowLoadingTrace,
        thresholdStats,
        sampleCount: samples.length,
        warmSequenceStartedAt,
        warmSequenceReadyAt,
        warmSequenceDurationMs: warmSequenceReadyAt - warmSequenceStartedAt,
        warmLoadingTrace,
        consoleErrors,
        pageErrors,
        failedRequests,
        abortedRequests,
      },
      null,
      2,
    ),
  );

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(thresholdStats.firstOverlayAt).toBeGreaterThanOrEqual(THRESHOLD_MS);
  expect(slowLoadingTrace.some((entry) => entry.testId === "atomic-loading-chapter")).toBe(true);
  expect(warmLoadingTrace.some((entry) => entry.testId === "atomic-loading-chapter")).toBe(false);
});

test("failed critical image retries without discarding the title", async ({ page }) => {
  const { pageErrors, failedRequests, abortedRequests, consoleErrors } = observePageIssues(page);
  await addLoadingTrace(page);
  await disableHttpCache(page);
  await page.route("https://us-assets.i.posthog.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: "" }),
  );
  let sumingAttempts = 0;
  await page.route("**/assets/portraits/suming-base.png", async (route) => {
    sumingAttempts += 1;
    if (sumingAttempts === 1) {
      await route.abort("failed");
      return;
    }
    await route.continue();
  });

  await resetToTitle(page);
  await page.waitForTimeout(700);
  failedRequests.length = 0;
  abortedRequests.length = 0;
  await resetLoadingTrace(page);
  const clickedAt = Date.now();
  await page.getByTestId("title-new-game").click();

  const recovery = page.getByTestId("atomic-loading-retry");
  await expect(recovery).toBeVisible({ timeout: 5_000 });
  const failedAt = Date.now();
  await expect(page.getByTestId("title-screen")).toBeVisible();
  await expect(recovery.getByRole("button", { name: "重试加载" })).toBeVisible();
  await expect(recovery.getByRole("button", { name: "刷新并恢复" })).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/casting-failure-recovery.png` });

  const retriedAt = Date.now();
  await recovery.getByRole("button", { name: "重试加载" }).click();
  await expect(page.getByTestId("character-studio")).toBeVisible({ timeout: 10_000 });
  const recoveredAt = Date.now();
  await expect(recovery).toHaveCount(0);
  await page.screenshot({ path: `${evidenceDir}/casting-retry-ready.png` });
  const loadingTrace = await readLoadingTrace(page);

  await writeFile(
    `${evidenceDir}/failure-retry-timing.json`,
    JSON.stringify(
      {
        clickedAt,
        failedAt,
        retriedAt,
        recoveredAt,
        failureFeedbackMs: failedAt - clickedAt,
        retryRecoveryMs: recoveredAt - retriedAt,
        sumingAttempts,
        loadingTrace,
        consoleErrors,
        pageErrors,
        failedRequests,
        abortedRequests,
      },
      null,
      2,
    ),
  );

  expect(sumingAttempts).toBe(2);
  expect(failedRequests.some((url) => url.includes("suming-base.png"))).toBe(true);
  // The awaited visible recovery locator above is the authoritative mount proof.
  // MutationObserver traces are diagnostic only and can miss a node when reset races a mutation.
  expect(pageErrors).toEqual([]);
});

test("dynamic chunk preload failure offers refresh recovery", async ({ page }) => {
  const { pageErrors, failedRequests, abortedRequests, consoleErrors } = observePageIssues(page);
  await addLoadingTrace(page);
  await page.route("https://us-assets.i.posthog.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: "" }),
  );

  await resetToTitle(page);
  failedRequests.length = 0;
  abortedRequests.length = 0;
  await resetLoadingTrace(page);
  const failedAt = Date.now();
  await page.evaluate(() => {
    window.dispatchEvent(new Event("vite:preloadError", { cancelable: true }));
  });

  const recovery = page.getByTestId("atomic-loading-retry");
  await expect(recovery).toBeVisible();
  await expect(page.getByTestId("title-screen")).toBeVisible();
  await expect(recovery.getByRole("button", { name: "重试加载" })).toHaveCount(0);
  const refresh = recovery.getByRole("button", { name: "刷新并恢复" });
  await expect(refresh).toBeVisible();
  const recoveryTrace = await readLoadingTrace(page);
  await page.screenshot({ path: `${evidenceDir}/chunk-refresh-recovery.png` });

  // Capture aborts from the departing document separately from post-reload failures.
  const abortsBeforeRefresh = abortedRequests.length;
  failedRequests.length = 0;
  const refreshedAt = Date.now();
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    refresh.click(),
  ]);
  // Returning session: boot seen may still be set; wait for a fully ready title.
  await expect(page.getByTestId("title-screen")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("atomic-loading-retry")).toHaveCount(0);
  await page.waitForLoadState("load");
  const readyAt = Date.now();
  await page.screenshot({ path: `${evidenceDir}/chunk-refresh-ready.png` });

  await writeFile(
    `${evidenceDir}/chunk-refresh-timing.json`,
    JSON.stringify(
      {
        failedAt,
        refreshedAt,
        readyAt,
        refreshRecoveryMs: readyAt - refreshedAt,
        recoveryTrace,
        consoleErrors,
        pageErrors,
        failedRequests,
        abortedRequests,
        abortsBeforeRefresh,
        abortsDuringOrAfterRefresh: abortedRequests.length - abortsBeforeRefresh,
      },
      null,
      2,
    ),
  );

  expect(recoveryTrace.some((entry) => entry.testId === "atomic-loading-retry")).toBe(true);
  expect(pageErrors).toEqual([]);
  // Real post-recovery failures must be empty; navigation aborts are tracked separately.
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
    const { pageErrors, failedRequests, abortedRequests, consoleErrors } = observePageIssues(page);
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.setItem("supaluv.boot.seen.v1", "1");
    });
    await page.route("https://us-assets.i.posthog.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/javascript", body: "" }),
    );
    await page.goto("/", { waitUntil: "domcontentloaded" });
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
    report.push({ viewport, layout, consoleErrors, pageErrors, failedRequests, abortedRequests });
    await context.close();
  }

  await writeFile(`${evidenceDir}/responsive-title-report.json`, JSON.stringify(report, null, 2));
});
