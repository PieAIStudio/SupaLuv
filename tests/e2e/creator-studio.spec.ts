import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const repoRoot = process.cwd();
const watchedFiles = [
  "packages/content/ink/draft-ch01.ink",
  "packages/content/compiled/draft-ch01.json",
  "packages/content/generated/narrative-graph-creator.json",
  "packages/content/generated/narrative-graph-player.json",
] as const;

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function startDraftAndOpenCreatorStudio(page: Page) {
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
}

test("Creator Studio saves one punctuation edit and rejects a compile failure without overwriting", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  page.on("pageerror", (error) => console.log(`[creator-pageerror] ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") console.log(`[creator-console] ${message.text()}`);
  });
  page.on("requestfailed", (request) =>
    console.log(`[creator-requestfailed] ${request.method()} ${request.url()}`),
  );
  const originalBytes = new Map<string, Uint8Array>();
  for (const path of watchedFiles) {
    originalBytes.set(path, await readFile(join(repoRoot, path)));
  }

  try {
    const graphResponse = await request.get("/__creator-studio/graph");
    expect(graphResponse.ok()).toBe(true);
    const envelope = (await graphResponse.json()) as {
      graph: {
        revision: string;
        nodes: Array<{
          stableSceneId: string;
          dialogueLines: Array<{
            text: string;
            sourceRange: { file: string; startLine: number; endLine: number } | null;
          }>;
        }>;
      };
    };
    const editable = envelope.graph.nodes
      .flatMap((node) =>
        node.dialogueLines.map((line) => ({ ...line, stableSceneId: node.stableSceneId })),
      )
      .find(
        (line) =>
          line.sourceRange?.file === "packages/content/ink/draft-ch01.ink" &&
          line.sourceRange.startLine === line.sourceRange.endLine &&
          line.text.includes("。"),
      );
    expect(editable?.sourceRange).toBeTruthy();
    if (!editable?.sourceRange) throw new Error("No editable punctuation line in draft-ch01");
    const punctuationEdit = editable.text.replace("。", "！");

    await startDraftAndOpenCreatorStudio(page);
    const revisionBefore = await page.getByTestId("creator-revision").textContent();
    await page.getByTestId("creator-search").fill(editable.stableSceneId);
    await page.locator(`[data-node-id*="${editable.stableSceneId}"]`).first().click();
    await page.locator(`[data-source-line-start="${editable.sourceRange.startLine}"]`).click();
    const editor = page.locator(".creator-source-editor .cm-content");
    await editor.fill(punctuationEdit);
    await page.getByTestId("creator-save").click();

    await expect(page.getByTestId("creator-save-status")).toContainText("已保存", {
      timeout: 30_000,
    });
    await expect(page.getByTestId("creator-selected-node")).toContainText(editable.stableSceneId);
    await expect(page.getByTestId("creator-revision")).not.toHaveText(revisionBefore ?? "");

    await page.reload();
    await startDraftAndOpenCreatorStudio(page);
    await page.getByTestId("creator-search").fill(editable.stableSceneId);
    await page.locator(`[data-node-id*="${editable.stableSceneId}"]`).first().click();
    await page.locator(`[data-source-line-start="${editable.sourceRange.startLine}"]`).click();
    await expect(page.locator(".creator-source-editor .cm-content")).toContainText(punctuationEdit);

    const beforeFailureBytes = await readFile(join(repoRoot, editable.sourceRange.file));
    await page.locator(".creator-source-editor .cm-content").fill("旁白：{ true:");
    await page.getByTestId("creator-save").click();
    await expect(page.getByTestId("creator-save-status")).toContainText("编译失败", {
      timeout: 30_000,
    });
    const afterFailureBytes = await readFile(join(repoRoot, editable.sourceRange.file));
    expect(sha256(afterFailureBytes)).toBe(sha256(beforeFailureBytes));
  } finally {
    for (const [path, bytes] of originalBytes) {
      await writeFile(join(repoRoot, path), bytes);
    }
  }
});
