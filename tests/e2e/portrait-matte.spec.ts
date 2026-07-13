import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

const evidenceRoot = path.resolve(".devspace-visual/portrait-matte/stage");

interface CaptureEvidence {
  readonly name: string;
  readonly portraitSrc: string;
  readonly naturalSize: { readonly width: number; readonly height: number };
  readonly stageBackgroundImage: string;
  readonly magentaPixelRatio: number;
  readonly screenshot: string;
}

async function startOfficialDraft(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("supaluv.boot.seen.v1", "1");
  });
  await page.goto("/?debug=1");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId("title-new-game").click();
  await page.getByRole("button", { name: "使用官方形象" }).click();
  await page.getByRole("button", { name: "使用官方形象" }).click();
  await expect(page.getByTestId("game-viewport")).toBeVisible({ timeout: 15_000 });

  await page.getByTestId("system-menu-toggle").click({ force: true });
  await page.getByTestId("save-button").click({ force: true });
  await expect(page.getByTestId("save-toast")).toBeVisible();
  await page.evaluate(() => {
    const moodBinding = {
      slotId: "lead_suming",
      packId: "e2e:official-suming-moods",
      baseUrl: "/assets/portraits/suming-base.png",
      moodUrls: {
        awkward: "/assets/portraits/suming-shame.png",
        surprised: "/assets/portraits/suming-panic.png",
        sad: "/assets/portraits/suming-lonely.png",
        happy: "/assets/portraits/suming-tempted.png",
        angry: "/assets/portraits/suming-restless.png",
      },
      lockedAt: "2026-07-13T00:00:00.000Z",
    };
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith("supaluv.save.v1.")) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const save = JSON.parse(raw) as { characterBindings?: Record<string, unknown> };
      save.characterBindings = { ...(save.characterBindings ?? {}), lead_suming: moodBinding };
      localStorage.setItem(key, JSON.stringify(save));
    }
  });
  await page.reload();
  await page.getByTestId("title-continue").click();
  await expect(page.getByTestId("game-viewport")).toBeVisible({ timeout: 15_000 });
}

async function revealAndChoose(page: Page, label: RegExp) {
  await page
    .getByTestId("story-copy")
    .click()
    .catch(() => undefined);
  const choice = page.locator(".choice-button:not(.ai-choice-button)", { hasText: label }).first();
  await expect(choice).toBeVisible({ timeout: 15_000 });
  await choice.click();
}

async function enableStorySelector(page: Page) {
  await page.getByTestId("system-menu-toggle").click({ force: true });
  const toggle = page.getByTestId("dev-tools-toggle");
  await expect(toggle).toBeVisible();
  const label = (await toggle.textContent()) ?? "";
  if (label.includes("开发工具") && !label.includes("隐藏")) {
    await toggle.click({ force: true });
  }
  await page.keyboard.press("Escape").catch(() => undefined);
  await expect(page.locator('select[aria-label="Story selector"]')).toBeVisible();
}

async function remapAwkwardMoodAndReload(page: Page, portraitFilename: string) {
  await page.getByTestId("system-menu-toggle").click({ force: true });
  await page.getByTestId("save-button").click({ force: true });
  await expect(page.getByTestId("save-toast")).toBeVisible();
  await page.evaluate((filename) => {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith("supaluv.save.v1.")) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const save = JSON.parse(raw) as {
        characterBindings?: Record<
          string,
          { moodUrls?: Record<string, string>; [key: string]: unknown }
        >;
      };
      const binding = save.characterBindings?.lead_suming;
      if (!binding) continue;
      binding.moodUrls = {
        ...(binding.moodUrls ?? {}),
        awkward: `/assets/portraits/${filename}`,
      };
      localStorage.setItem(key, JSON.stringify(save));
    }
  }, portraitFilename);
  await page.reload();
  await page.getByTestId("title-continue").click();
  await expect(page.getByTestId("game-viewport")).toBeVisible({ timeout: 15_000 });
}

async function strongMagentaRatio(
  imagePath: string,
  crop: {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  },
) {
  const { data, info } = await sharp(imagePath)
    .extract(crop)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let magenta = 0;
  const total = info.width * info.height;
  for (let pixel = 0; pixel < total; pixel += 1) {
    const offset = pixel * info.channels;
    const red = data[offset]!;
    const green = data[offset + 1]!;
    const blue = data[offset + 2]!;
    if (red > 160 && blue > 120 && Math.min(red, blue) - green > 40 && Math.abs(red - blue) < 100) {
      magenta += 1;
    }
  }
  return magenta / total;
}

async function captureStage(page: Page, name: string, portraitFilename: string) {
  const stage = page.getByTestId("vn-stage");
  const portrait = page.locator(`img.portrait-image[src$="${portraitFilename}"]:visible`).first();
  await expect(portrait).toBeVisible();
  await expect
    .poll(() =>
      portrait.evaluate((element) => {
        const image = element as HTMLImageElement;
        return image.complete && image.naturalWidth === 832 && image.naturalHeight === 1248;
      }),
    )
    .toBe(true);

  const screenshotPath = path.join(evidenceRoot, `${name}.png`);
  await stage.screenshot({ path: screenshotPath, animations: "disabled" });
  const [stageBox, portraitBox] = await Promise.all([stage.boundingBox(), portrait.boundingBox()]);
  if (!stageBox || !portraitBox) throw new Error(`missing stage geometry for ${name}`);
  const crop = {
    left: Math.max(0, Math.round(portraitBox.x - stageBox.x)),
    top: Math.max(0, Math.round(portraitBox.y - stageBox.y)),
    width: Math.min(Math.round(portraitBox.width), Math.round(stageBox.width)),
    height: Math.min(Math.round(portraitBox.height), Math.round(stageBox.height)),
  };
  const magentaPixelRatio = await strongMagentaRatio(screenshotPath, crop);
  const metadata = await portrait.evaluate((element) => {
    const image = element as HTMLImageElement;
    return {
      portraitSrc: image.currentSrc || image.src,
      naturalSize: { width: image.naturalWidth, height: image.naturalHeight },
      stageBackgroundImage: getComputedStyle(
        image.closest<HTMLElement>("[data-testid='vn-stage']")!,
      ).backgroundImage,
    };
  });

  expect(magentaPixelRatio).toBeLessThanOrEqual(0.005);
  return {
    name,
    ...metadata,
    magentaPixelRatio,
    screenshot: path.relative(process.cwd(), screenshotPath),
  } satisfies CaptureEvidence;
}

test("Su Ming repaired portraits render on bright and dark game stages", async ({ page }) => {
  await fs.mkdir(evidenceRoot, { recursive: true });
  const consoleErrors: Array<{
    readonly text: string;
    readonly url: string;
    readonly lineNumber: number;
    readonly columnNumber: number;
  }> = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  const httpErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      const location = message.location();
      consoleErrors.push({
        text: message.text(),
        url: location.url,
        lineNumber: location.lineNumber,
        columnNumber: location.columnNumber,
      });
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    requestFailures.push(
      `${request.method()} ${request.url()} ${request.failure()?.errorText ?? ""}`,
    );
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      httpErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });

  await startOfficialDraft(page);
  const captures: CaptureEvidence[] = [];
  captures.push(await captureStage(page, "draft-shame-office-dark", "suming-shame.png"));

  await revealAndChoose(page, /^继续$/);
  await expect(page.getByTestId("emotion-calibration")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("emotion-calibration-skip").click();
  await expect(page.getByTestId("emotion-calibration")).toHaveCount(0);
  captures.push(await captureStage(page, "draft-shame-lobby-bright", "suming-shame.png"));

  await enableStorySelector(page);
  await page.locator('select[aria-label="Story selector"]').selectOption("prototype-act1");
  captures.push(await captureStage(page, "prototype-shame-office-dark", "suming-shame.png"));

  await revealAndChoose(page, /先截图备份/);
  await remapAwkwardMoodAndReload(page, "suming-panic.png");
  captures.push(await captureStage(page, "prototype-panic-office-dark", "suming-panic.png"));

  await revealAndChoose(page, /用身体挡住屏幕/);
  await revealAndChoose(page, /跳过现实，直接回家研究/);
  await remapAwkwardMoodAndReload(page, "suming-lonely.png");
  captures.push(await captureStage(page, "prototype-lonely-rental-dark", "suming-lonely.png"));

  const report = {
    origin: new URL(page.url()).origin,
    captures,
    consoleErrors,
    pageErrors,
    requestFailures,
    httpErrors,
  };
  await fs.writeFile(
    path.join(evidenceRoot, "browser-evidence.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );

  expect(pageErrors).toEqual([]);
  expect(requestFailures).toEqual([]);
  expect(httpErrors.filter((entry) => entry.includes("/assets/portraits/"))).toEqual([]);
});
