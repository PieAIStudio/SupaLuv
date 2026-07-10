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

  it("keeps scene ids aligned between ch01 metadata and Ink knots", async () => {
    const content = await import("@supaluv/content");
    const knotIds = getInkKnotIds(content.ch01InkSource);
    const sceneIds = content.ch01Scenes.map((scene) => scene.id);

    expect([...knotIds].sort()).toEqual([...sceneIds].sort());
    expect(content.ch01Scenes.every((scene) => scene.noncanonical)).toBe(true);
    expect(content.ch01Scenes.every((scene) => scene.source === "chapter-01-narrative-draft")).toBe(
      true,
    );
    // Expanded chapter should have enough beats for real pacing.
    expect(content.ch01Scenes.length).toBeGreaterThanOrEqual(35);
  });

  it("exposes art, portrait, audio, and video assets for chapter 01 demo", async () => {
    const content = await import("@supaluv/content");
    const artKeys = content.ch01Scenes.map((scene) => scene.artKey).filter(Boolean);
    const requiredBg = ["bg-office-night", "bg-rental-room", "bg-product-page", "bg-lobby-white"];

    for (const key of requiredBg) {
      expect(artKeys).toContain(key);
      expect(
        existsSync(new URL(`../../apps/web/public/assets/scenes/${key}.jpg`, import.meta.url)),
      ).toBe(true);
    }

    expect(
      content.ch01Scenes.some(
        (scene) => "portraitKey" in scene && scene.portraitKey === "suming-shame",
      ),
    ).toBe(true);
    expect(
      content.ch01Scenes.some(
        (scene) => "videoKey" in scene && scene.videoKey === "ch01-cold-open",
      ),
    ).toBe(true);
    expect(
      content.ch01Scenes.some(
        (scene) => "videoKey" in scene && scene.videoKey === "ch01-demo-echo",
      ),
    ).toBe(true);

    expect(
      existsSync(
        new URL("../../apps/web/public/assets/portraits/suming-shame.png", import.meta.url),
      ),
    ).toBe(true);
    expect(
      existsSync(new URL("../../apps/web/public/assets/video/ch01-cold-open.mp4", import.meta.url)),
    ).toBe(true);
    expect(
      existsSync(new URL("../../apps/web/public/assets/video/ch01-demo-echo.mp4", import.meta.url)),
    ).toBe(true);
    expect(
      existsSync(new URL("../../apps/web/public/assets/audio/sfx/ui-click.mp3", import.meta.url)),
    ).toBe(true);
  });

  it("playable runner starts on expanded chapter 01 cold open stare", async () => {
    const { createCh01InkStoryRunner } = await import("../../apps/web/src/story/inkStoryRunner");
    const runner = createCh01InkStoryRunner();
    const snapshot = runner.getSnapshot();

    expect(snapshot.sceneId).toBe("ch01_office_stare");
    expect(snapshot.text).toContain("三分十七秒");
    expect(snapshot.choices.length).toBe(1);
    expect(snapshot.choices[0]?.text).toContain("继续");
    expect(snapshot.meters.dignity).toBe(50);

    const next = runner.choose(0);
    expect(next.sceneId).toBe("ch01_office_bug_eyes");
    expect(next.text).toContain("bug");

    runner.choose(0);
    const shame = runner.choose(0);
    expect(shame.sceneId).toBe("ch01_office_delete_or_shot");
    expect(shame.choices.length).toBe(2);
  });
});
