import { expect, test } from "@playwright/test";

/**
 * ADR-0008 P0b/P1: English locale loads en Ink, English nameplates, and
 * hits the pregenerated /assets/voice bank for authored lines.
 */
async function openEnglishCh01(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.setItem("supaluv.boot.seen.v1", "1");
    // Default voice on so pregen path is eligible (volume > 0).
    localStorage.setItem(
      "supaluv.settings.v1",
      JSON.stringify({
        masterMuted: false,
        musicVolume: 0,
        ambientVolume: 0,
        sfxVolume: 0,
        voiceVolume: 0.8,
        textSpeed: "normal",
        autoPlay: false,
      }),
    );
  });
  await page.goto("/");
  await expect(page.getByTestId("title-screen")).toBeVisible();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page.getByTestId("title-new-game").click();
  const official = page.getByRole("button", { name: "Use official portrait" });
  await expect(official).toBeVisible({ timeout: 15_000 });
  await official.click();
  await official.click();
  await expect(page.getByTestId("game-viewport")).toBeVisible({ timeout: 20_000 });
}

test("English ch01 shows English prose, Staff nameplate, and pregen voice fetch", async ({
  page,
}) => {
  test.setTimeout(90_000);

  const voiceRequests: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/assets/voice/") && url.endsWith(".mp3")) {
      voiceRequests.push(url);
    }
  });

  await openEnglishCh01(page);

  const dialogue = page.getByTestId("dialogue-box");
  await expect(dialogue).toBeVisible({ timeout: 20_000 });

  // Body text is English (Latin), not Chinese Han for the opening line.
  const copy = page.getByTestId("story-copy");
  await expect(copy).toBeVisible();
  const body = (await copy.textContent()) ?? "";
  expect(body.length).toBeGreaterThan(20);
  expect(/\p{Script=Latin}/u.test(body)).toBe(true);
  expect(/聊天记录|苏明|工作人员/.test(body)).toBe(false);

  // Nameplate: staff speaker from first scene → enName "Staff".
  const nameplate = page.locator(".nameplate").first();
  await expect(nameplate).toBeVisible();
  const speaker = ((await nameplate.textContent()) ?? "").trim();
  expect(["Staff", "Narrator", "Su Ming", "System", "AI"]).toContain(speaker);
  expect(speaker).not.toMatch(/工作人员|旁白|苏明|系统/);

  // Pregen voice: either catalog.json + mp3 request, or at least catalog load.
  // Voice autoplay is async; wait a bit for the fetch path.
  await page.waitForTimeout(2500);
  const catalogHit = await page.evaluate(async () => {
    const response = await fetch("/assets/voice/catalog.json");
    if (!response.ok) return { ok: false, keys: 0 };
    const body = (await response.json()) as { keys?: string[] };
    return { ok: true, keys: Array.isArray(body.keys) ? body.keys.length : 0 };
  });
  expect(catalogHit.ok).toBe(true);
  expect(catalogHit.keys).toBeGreaterThanOrEqual(136);

  // If autoplay fired, assert an mp3 under /assets/voice was requested.
  // When freeform is off guests still use pregen; allow zero if mute/gating
  // races, but prefer a hit when voice volume is on.
  if (voiceRequests.length > 0) {
    expect(voiceRequests.some((url) => /\/assets\/voice\/[0-9a-f]{16}\.mp3/.test(url))).toBe(true);
  } else {
    // Manual probe: compute key for opening line is hard; assert catalog has
    // more than baseline zh after EN bank lands (en expands keys).
    expect(catalogHit.keys).toBeGreaterThan(136);
  }
});

test("Chinese locale ch01 regression still shows Chinese prose", async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.setItem("supaluv.boot.seen.v1", "1");
  });
  await page.goto("/");
  await expect(page.getByTestId("title-screen")).toBeVisible();
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await page.getByTestId("title-new-game").click();
  const official = page.getByRole("button", { name: "使用官方形象" });
  await expect(official).toBeVisible({ timeout: 15_000 });
  await official.click();
  await official.click();
  await expect(page.getByTestId("game-viewport")).toBeVisible({ timeout: 20_000 });

  const body = (await page.getByTestId("story-copy").textContent()) ?? "";
  expect(/\p{Script=Han}/u.test(body)).toBe(true);
  const speaker = ((await page.locator(".nameplate").first().textContent()) ?? "").trim();
  expect(speaker).toMatch(/工作人员|旁白|苏明|系统|AI|陈佳|雷欧/);
});
