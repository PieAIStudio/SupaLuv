import { mkdir } from "node:fs/promises";
import { expect, test, type Browser, type Page } from "@playwright/test";

const evidenceDir = ".devspace-visual/casting-mobile-polish/after/e2e";

const fakeSession = {
  access_token: "casting-e2e-access-token",
  refresh_token: "casting-e2e-refresh-token",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: {
    id: "00000000-0000-4000-8000-000000000042",
    aud: "authenticated",
    role: "authenticated",
    email: "casting@example.test",
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: "2026-07-13T00:00:00.000Z",
  },
};

function observePageIssues(page: Page) {
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const consoleErrors: string[] = [];
  const httpErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) =>
    failedRequests.push(`${request.url()} · ${request.failure()?.errorText ?? "unknown"}`),
  );
  page.on("console", (message) => {
    if (message.type() === "error") {
      const location = message.location().url;
      consoleErrors.push(location ? `${message.text()} @ ${location}` : message.text());
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.url()}`);
  });
  return { pageErrors, failedRequests, consoleErrors, httpErrors };
}

async function installReturningSession(page: Page, signedIn = false) {
  await page.route("**/favicon.ico", (route) =>
    route.fulfill({ status: 204, contentType: "image/x-icon", body: "" }),
  );
  await page.addInitScript(
    ({ session, withSession }) => {
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem("supaluv.boot.seen.v1", "1");
      if (withSession) {
        localStorage.setItem("supaluv.swimmer.auth.v1", JSON.stringify(session));
      }
    },
    { session: fakeSession, withSession: signedIn },
  );
}

async function assertNoHorizontalOverflow(page: Page, width: number) {
  const layout = await page.evaluate(() => ({
    bodyScrollWidth: document.body.scrollWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.bodyScrollWidth).toBeLessThanOrEqual(width);
  expect(layout.documentScrollWidth).toBeLessThanOrEqual(width);
}

async function expectFullyInsideViewport(
  page: Page,
  testId: string,
  width: number,
  height: number,
) {
  const target = page.getByTestId(testId);
  await expect(target).toBeVisible();
  const box = await target.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(height);
  return box!;
}

async function openCasting(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("title-screen")).toBeVisible();
  await page.getByTestId("title-new-game").click();
  await expect(page.getByTestId("character-studio")).toBeVisible({ timeout: 10_000 });
}

test.beforeAll(async () => {
  await mkdir(evidenceDir, { recursive: true });
});

test("title and casting keep primary controls reachable at required viewports", async ({
  browser,
}: {
  browser: Browser;
}) => {
  const cases = [
    { name: "desktop-1440x900", width: 1440, height: 900, portraitGate: false },
    { name: "landscape-844x390", width: 844, height: 390, portraitGate: false },
    { name: "portrait-390x844", width: 390, height: 844, portraitGate: true },
  ] as const;

  for (const viewport of cases) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    const issues = observePageIssues(page);
    await installReturningSession(page);
    await page.goto("/");
    await expect(page.getByTestId("title-screen")).toBeVisible();
    await assertNoHorizontalOverflow(page, viewport.width);

    if (viewport.portraitGate) {
      await expectFullyInsideViewport(page, "orientation-gate", viewport.width, viewport.height);
      await page.screenshot({ path: `${evidenceDir}/title-${viewport.name}.png` });
    } else {
      const newGameBox = await expectFullyInsideViewport(
        page,
        "title-new-game",
        viewport.width,
        viewport.height,
      );
      const continueBox = await expectFullyInsideViewport(
        page,
        "title-continue",
        viewport.width,
        viewport.height,
      );
      expect(newGameBox.height).toBeGreaterThanOrEqual(44);
      expect(continueBox.height).toBeGreaterThanOrEqual(44);
      await expect(page.getByTestId("title-account-row")).toBeVisible();

      const more = page.getByTestId("title-more-toggle");
      if (viewport.width === 844) {
        const moreBox = await expectFullyInsideViewport(
          page,
          "title-more-toggle",
          viewport.width,
          viewport.height,
        );
        expect(moreBox.height).toBeGreaterThanOrEqual(44);
        await expect(page.locator("details.title-more")).not.toHaveAttribute("open", "");
        await more.click();
        await expect(page.getByTestId("title-settings")).toBeVisible();
      } else {
        await expect(more).toBeHidden();
        await expect(page.locator("details.title-more")).toHaveAttribute("open", "");
        await expect(page.getByTestId("title-settings")).toBeVisible();
      }

      await page.screenshot({ path: `${evidenceDir}/title-${viewport.name}.png` });
      await page.getByTestId("title-new-game").click();
      await expect(page.getByTestId("character-studio")).toBeVisible({ timeout: 10_000 });
      await assertNoHorizontalOverflow(page, viewport.width);
      await expect(page.getByTestId("character-file-input")).toHaveAttribute("type", "file");
      await expect(page.getByTestId("character-file-input")).toHaveAttribute("multiple", "");
      await expect(page.getByTestId("character-file-input")).toHaveAttribute(
        "accept",
        "image/jpeg,image/png,image/webp,image/avif",
      );
      const nativeInputPresentation = await page
        .getByTestId("character-file-input")
        .evaluate((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return {
            width: rect.width,
            height: rect.height,
            clipPath: style.clipPath,
            position: style.position,
          };
        });
      expect(nativeInputPresentation).toMatchObject({
        width: 1,
        height: 1,
        clipPath: "inset(50%)",
        position: "absolute",
      });
      await expect(page.locator("body")).not.toContainText("Choose Files");
      await expect(page.locator("body")).not.toContainText("No file chosen");

      if (viewport.width === 844) {
        await expectFullyInsideViewport(
          page,
          "character-studio-preview",
          viewport.width,
          viewport.height,
        );
        const triggerBox = await expectFullyInsideViewport(
          page,
          "character-file-trigger",
          viewport.width,
          viewport.height,
        );
        const actionsBox = await expectFullyInsideViewport(
          page,
          "character-studio-actions",
          viewport.width,
          viewport.height,
        );
        expect(triggerBox.height).toBeGreaterThanOrEqual(44);
        expect(actionsBox.height).toBeGreaterThanOrEqual(44);
        await expect(page.getByRole("button", { name: "生成基准形象" })).toBeVisible();
        await expect(page.getByRole("button", { name: "使用官方形象" })).toBeVisible();
        await expect(page.getByTestId("character-studio-scroll-note")).toBeVisible();
        const scrollBody = page.locator(".character-studio-control-body");
        const scrolling = await scrollBody.evaluate((node) => ({
          clientHeight: node.clientHeight,
          scrollHeight: node.scrollHeight,
          overflowY: getComputedStyle(node).overflowY,
        }));
        expect(scrolling.scrollHeight).toBeGreaterThan(scrolling.clientHeight);
        expect(scrolling.overflowY).toBe("auto");
        await page.getByText("内容边界").scrollIntoViewIfNeeded();
        await expect(page.getByText("内容边界")).toBeVisible();
        await expect(page.getByRole("button", { name: "使用官方形象" })).toBeVisible();
      }

      await page.screenshot({ path: `${evidenceDir}/casting-empty-${viewport.name}.png` });
    }

    expect(issues.consoleErrors).toEqual([]);
    expect(issues.pageErrors).toEqual([]);
    expect(issues.failedRequests).toEqual([]);
    expect(issues.httpErrors).toEqual([]);
    await context.close();
  }
});

test("localized upload supports keyboard activation, selection feedback, limits, and busy state", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  const issues = observePageIssues(page);
  await installReturningSession(page, true);
  await page.route("**/wallet/balance", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: '{"batteries":99}' }),
  );
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.endsWith("/api/ai/characters/packs")) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        throw new Error("测试上传在创建角色包后停止。");
      }
      return originalFetch(input, init);
    };
  });
  await openCasting(page);

  const trigger = page.getByTestId("character-file-trigger");
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(
      () => (document.activeElement as HTMLElement | null)?.dataset.testid ?? null,
    );
    if (focused === "character-file-trigger") break;
  }
  await expect(trigger).toBeFocused();
  const focusStyle = await trigger.evaluate((node) => {
    const style = getComputedStyle(node);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  expect(focusStyle.outlineStyle).not.toBe("none");
  expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(3);

  const chooserPromise = page.waitForEvent("filechooser");
  await trigger.press("Enter");
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: "adult-reference.png",
    mimeType: "image/png",
    buffer: Buffer.from([137, 80, 78, 71]),
  });
  await expect(page.getByTestId("character-file-status")).toHaveText("已选择 1 张，可以生成。");
  await expect(trigger).toHaveText("重新选择照片");
  await page.screenshot({ path: `${evidenceDir}/casting-selected-landscape-844x390.png` });

  await page.getByTestId("character-file-input").setInputFiles([
    { name: "one.png", mimeType: "image/png", buffer: Buffer.from([1]) },
    { name: "two.jpg", mimeType: "image/jpeg", buffer: Buffer.from([2]) },
    { name: "three.webp", mimeType: "image/webp", buffer: Buffer.from([3]) },
    { name: "four.avif", mimeType: "image/avif", buffer: Buffer.from([4]) },
    { name: "not-an-image.txt", mimeType: "text/plain", buffer: Buffer.from([5]) },
  ]);
  const status = page.getByTestId("character-file-status");
  await expect(status).toContainText("已选择 3 张");
  await expect(status).toContainText("1 个类型不支持");
  await expect(status).toContainText("1 个超出上限");
  await expect(status).not.toContainText("not-an-image.txt");

  await page.getByRole("button", { name: "生成基准形象" }).click();
  await expect(trigger).toBeDisabled();
  await expect(page.getByTestId("character-file-input")).toBeDisabled();
  await expect(status).toHaveText("正在处理，暂时无法更改参考照片。");
  await expect(page.getByRole("progressbar", { name: "正在安全上传" })).toBeVisible();
  await expect(page.getByTestId("character-studio-error")).toContainText(
    "测试上传在创建角色包后停止。",
  );
  await expect(trigger).toBeEnabled();

  expect(issues.consoleErrors).toEqual([]);
  expect(issues.pageErrors).toEqual([]);
  expect(issues.failedRequests).toEqual([]);
  expect(issues.httpErrors).toEqual([]);
});
