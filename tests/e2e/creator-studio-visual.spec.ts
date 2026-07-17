import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const evidenceDir = resolve(".devspace-visual/creator-studio");

/** Generated graph artifact is the truth for node/edge counts — hardcoded
 * numbers rotted every time a chapter was re-converted from the novel. */
async function readGeneratedGraphCounts(): Promise<{ nodes: number; edges: number }> {
  const raw = await readFile(
    resolve("packages/content/generated/narrative-graph-creator.json"),
    "utf8",
  );
  const graph = JSON.parse(raw) as { nodes: unknown[]; edges: unknown[] };
  return { nodes: graph.nodes.length, edges: graph.edges.length };
}

async function openCreatorStudio(page: Page) {
  await page.goto("/?debug=1");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.setItem("supaluv.boot.seen.v1", "1");
  });
  await page.reload();
  await page.getByTestId("title-new-game").click();
  await page.getByRole("button", { name: "使用官方形象" }).click();
  await page.getByRole("button", { name: "使用官方形象" }).click();
  await expect(page.getByTestId("game-viewport")).toBeVisible();
  await page.getByTestId("system-menu-toggle").click({ force: true });
  const devToggle = page.getByTestId("dev-tools-toggle");
  await expect(devToggle).toBeVisible();
  if (!((await devToggle.textContent()) ?? "").includes("隐藏")) {
    await devToggle.click({ force: true });
  }
  await page.getByRole("menuitem", { name: "创作地图" }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await expect(page.getByTestId("creator-studio")).toBeVisible();
  await expect(page.getByTestId("creator-revision")).not.toHaveText("loading");
}

test("Creator Studio visual evidence at desktop and narrow desktop", async ({ page, request }) => {
  test.setTimeout(90_000);
  await mkdir(evidenceDir, { recursive: true });
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (failed) =>
    failedRequests.push(`${failed.method()} ${failed.url()} ${failed.failure()?.errorText ?? ""}`),
  );

  const expected = await readGeneratedGraphCounts();
  await page.setViewportSize({ width: 1440, height: 900 });
  await openCreatorStudio(page);
  // Viewport culling settles asynchronously after fitView; poll instead of
  // sampling once. Culling is proven by rendering fewer nodes than the graph has.
  await expect
    .poll(() => page.locator(".react-flow__node").count(), { timeout: 15_000 })
    .toBeLessThan(expected.nodes);
  const renderedNodeCount = await page.locator(".react-flow__node").count();
  expect(renderedNodeCount).toBeGreaterThan(0);
  await page.screenshot({ path: `${evidenceDir}/desktop-1440x900.png` });

  const graphResponse = await request.get("/__creator-studio/graph");
  expect(graphResponse.ok()).toBe(true);
  const envelope = (await graphResponse.json()) as {
    graph: {
      nodes: Array<{
        stableSceneId: string;
        dialogueLines: Array<{ sourceRange: { startLine: number } | null }>;
      }>;
      edges: unknown[];
    };
  };
  expect(envelope.graph.nodes).toHaveLength(expected.nodes);
  expect(envelope.graph.edges).toHaveLength(expected.edges);
  const target = envelope.graph.nodes.find((node) =>
    node.dialogueLines.some((line) => Boolean(line.sourceRange)),
  );
  expect(target).toBeTruthy();
  if (!target) throw new Error("Creator graph has no editable node");
  const sourceLine = target.dialogueLines.find((line) => line.sourceRange)?.sourceRange?.startLine;
  expect(sourceLine).toBeTruthy();
  if (!sourceLine) throw new Error("Creator graph has no editable source line");

  await page.getByTestId("creator-search").fill(target.stableSceneId);
  await page.locator(`[data-node-id="${target.stableSceneId}"]`).first().click();
  await page.locator(`[data-source-line-start="${sourceLine}"]`).click();
  await page.setViewportSize({ width: 1080, height: 800 });
  await page.getByTestId("creator-save").scrollIntoViewIfNeeded();
  await expect(page.locator(".creator-source-editor .cm-content")).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/narrow-1080x800-editor.png` });

  const studioBox = await page.getByTestId("creator-studio").boundingBox();
  const searchBox = await page.getByTestId("creator-search").boundingBox();
  const editorBox = await page.locator(".creator-source-editor").boundingBox();
  await writeFile(
    `${evidenceDir}/browser-evidence.json`,
    `${JSON.stringify(
      {
        origin: page.url(),
        viewports: [
          { width: 1440, height: 900, screenshot: "desktop-1440x900.png" },
          { width: 1080, height: 800, screenshot: "narrow-1080x800-editor.png" },
        ],
        boxes: { studio: studioBox, search: searchBox, editor: editorBox },
        graph: { nodes: envelope.graph.nodes.length, edges: envelope.graph.edges.length },
        renderedNodeCount,
        pageErrors,
        consoleErrors,
        failedRequests,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  expect(pageErrors).toEqual([]);
  expect(failedRequests.filter((entry) => !entry.includes("net::ERR_ABORTED"))).toEqual([]);
});
