import { describe, expect, it, beforeEach } from "vitest";
import {
  clearStoryChapterCache,
  loadStoryChapter,
  resolveCharacterDisplayName,
  resolveStoryContentLocale,
} from "@supaluv/content";
import { createInkStoryRunnerFromCompiled } from "../../apps/web/src/story/inkStoryRunner";

describe("story content locale (ADR-0008 P0b)", () => {
  beforeEach(() => {
    clearStoryChapterCache();
  });

  it("maps UI locales to content locales", () => {
    expect(resolveStoryContentLocale("zh-CN")).toBe("zh-CN");
    expect(resolveStoryContentLocale("zh")).toBe("zh-CN");
    expect(resolveStoryContentLocale("en")).toBe("en");
    expect(resolveStoryContentLocale("ja")).toBe("en");
    expect(resolveStoryContentLocale(undefined)).toBe("zh-CN");
  });

  it("loads English compiled Ink for draft-ch01 and Chinese for default", async () => {
    const zh = await loadStoryChapter("draft-ch01", "zh-CN");
    const en = await loadStoryChapter("draft-ch01", "en");
    expect(zh.compiledStoryJson).not.toBe(en.compiledStoryJson);

    const zhRunner = createInkStoryRunnerFromCompiled(zh.compiledStoryJson);
    const enRunner = createInkStoryRunnerFromCompiled(en.compiledStoryJson);
    const zhText = zhRunner.getSnapshot().text;
    const enText = enRunner.getSnapshot().text;
    expect(zhText.length).toBeGreaterThan(20);
    expect(enText.length).toBeGreaterThan(20);
    // English draft opens with Latin prose; Chinese with Han.
    expect(/\p{Script=Han}/u.test(zhText)).toBe(true);
    expect(/\p{Script=Latin}/u.test(enText)).toBe(true);
  });

  it("falls back to Chinese compiled Ink when a chapter has no English export", async () => {
    const zh = await loadStoryChapter("prototype-act1", "zh-CN");
    const en = await loadStoryChapter("prototype-act1", "en");
    // No compiledEn on prototype-act1 → same payload, no throw.
    expect(en.compiledStoryJson).toBe(zh.compiledStoryJson);
    expect(en.scenes.length).toBe(zh.scenes.length);
  });

  it("resolves enName from the character registry", () => {
    expect(resolveCharacterDisplayName("苏明", "en")).toBe("Su Ming");
    expect(resolveCharacterDisplayName("陈佳", "en")).toBe("Chen Jia");
    expect(resolveCharacterDisplayName("石佩欣", "en")).toBe("Shi Peixin");
    expect(resolveCharacterDisplayName("朱珠", "en")).toBe("Zhu Zhu");
    expect(resolveCharacterDisplayName("黄老太", "en")).toBe("Granny Huang");
    expect(resolveCharacterDisplayName("旁白", "en")).toBe("Narrator");
    expect(resolveCharacterDisplayName("系统", "en")).toBe("System");
    expect(resolveCharacterDisplayName("工作人员", "en")).toBe("Staff");
    expect(resolveCharacterDisplayName("苏明", "zh-CN")).toBe("苏明");
  });

  it("keeps ink state loadable across zh→en compiled stories (save compat)", async () => {
    const zh = await loadStoryChapter("draft-ch01", "zh-CN");
    const en = await loadStoryChapter("draft-ch01", "en");
    const zhRunner = createInkStoryRunnerFromCompiled(zh.compiledStoryJson);
    // Advance one choice if available so state is past the opening chunk.
    const opening = zhRunner.getSnapshot();
    if (opening.choices.length > 0) {
      zhRunner.choose(0);
    }
    const stateJson = zhRunner.exportStateJson();
    // Loading the same topology into the English compile must not throw.
    const enRunner = createInkStoryRunnerFromCompiled(en.compiledStoryJson, stateJson);
    const restored = enRunner.getSnapshot();
    expect(restored.meters.mianzi).toBeTypeOf("number");
    expect(restored.isEnded === true || restored.choices.length >= 0).toBe(true);
  });
});
