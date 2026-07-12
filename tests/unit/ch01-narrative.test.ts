import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const novelPath = new URL("../../packages/content/narrative/chapter-01/novel.md", import.meta.url);
const scriptPath = new URL(
  "../../packages/content/narrative/chapter-01/script.md",
  import.meta.url,
);

function getInkKnotIds(source: string): string[] {
  return Array.from(source.matchAll(/^===\s+([a-z0-9_]+)\s+===/gm), (match) => match[1]).filter(
    (knotId): knotId is string => knotId !== undefined,
  );
}

describe("chapter 01 narrative draft", () => {
  it("keeps novel and script source files", () => {
    expect(existsSync(novelPath)).toBe(true);
    expect(existsSync(scriptPath)).toBe(true);
  });

  it("novel has 起承转合 section markers and key continuity anchors", () => {
    const novel = readFileSync(novelPath, "utf8");

    expect(novel).toContain("## 起");
    expect(novel).toContain("## 承");
    expect(novel).toContain("## 转");
    expect(novel).toContain("## 合");
    expect(novel).toContain("不会嫌弃你");
    expect(novel).toContain("苏明");
    expect(novel).toContain("林晓棠");
    expect(novel).toContain("周鹿");
    expect(novel).toContain("分批发货");
    expect(novel.length).toBeGreaterThan(2500);
  });

  it("keeps retired demo archive aligned between metadata and Ink knots", async () => {
    const content = await import("@supaluv/content");
    const { ch01Scenes } = await import("@supaluv/content/ch01-scenes");
    const legacyInk = readFileSync(
      new URL("../../packages/content/ink/legacy/ch01.ink", import.meta.url),
      "utf8",
    );
    const knotIds = getInkKnotIds(legacyInk);
    const sceneIds = ch01Scenes.map((scene) => scene.id);

    expect([...knotIds].sort()).toEqual([...sceneIds].sort());
    expect(ch01Scenes.every((scene) => scene.noncanonical)).toBe(true);
    expect(ch01Scenes.every((scene) => scene.source === "chapter-01-narrative-draft")).toBe(true);
    expect(ch01Scenes.length).toBeGreaterThanOrEqual(35);
    // Retired demo is not in production catalog.
    expect(content.legacyCh01Archive.id).toBe("ch01");
    expect(content.productionStoryCatalog.map((s) => s.id).includes("ch01" as never)).toBe(false);
  });

  it("exposes still art, portrait, and audio assets used by draft chapters", async () => {
    const { draftCh01Scenes } = await import("@supaluv/content/draft-ch01-scenes");
    const artKeys = draftCh01Scenes.map((scene) => scene.artKey).filter(Boolean);
    const requiredBg = ["bg-office-night", "bg-rental-room", "bg-product-page", "bg-lobby-white"];

    for (const key of requiredBg) {
      expect(artKeys).toContain(key);
      expect(
        existsSync(new URL(`../../apps/web/public/assets/scenes/${key}.jpg`, import.meta.url)),
      ).toBe(true);
    }

    expect(
      draftCh01Scenes.some(
        (scene) => "portraitKey" in scene && scene.portraitKey === "suming-shame",
      ),
    ).toBe(true);
    expect(draftCh01Scenes.every((scene) => !("videoKey" in scene))).toBe(true);

    expect(
      existsSync(
        new URL("../../apps/web/public/assets/portraits/suming-shame.png", import.meta.url),
      ),
    ).toBe(true);
    expect(
      existsSync(new URL("../../apps/web/public/assets/video/ch01-cold-open.mp4", import.meta.url)),
    ).toBe(false);
    expect(
      existsSync(new URL("../../apps/web/public/assets/video/ch01-demo-echo.mp4", import.meta.url)),
    ).toBe(false);
    expect(
      existsSync(new URL("../../apps/web/public/assets/audio/sfx/ui-click.mp3", import.meta.url)),
    ).toBe(true);
  });

  it("playable draft runner starts on chapter 1 protocol beat", async () => {
    const { createDraftCh01InkStoryRunner } =
      await import("../../apps/web/src/story/inkStoryRunner");
    const runner = await createDraftCh01InkStoryRunner();
    const snapshot = runner.getSnapshot();

    expect(snapshot.sceneId).toMatch(/^dch01_/);
    expect(snapshot.text.length).toBeGreaterThan(10);
    expect(snapshot.choices.length).toBeGreaterThanOrEqual(1);
    expect(snapshot.meters.dignity).toBe(50);

    const next = runner.choose(0);
    expect(next.sceneId).not.toBe(snapshot.sceneId);
    expect(next.text.length).toBeGreaterThan(0);
  });
});
