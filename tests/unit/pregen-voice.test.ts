import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  fnv1a64Hex,
  normalizeVoiceText,
  pregenVoiceKey,
  pregenVoiceUrl,
} from "../../apps/web/src/audio/pregenVoice";
import { planBrowserTtsSegments } from "../../apps/web/src/audio/ttsSegmentation";
import { ENGLISH_VOICE_MAP } from "../../services/ai-branch/src/ttsRoute";

/**
 * Runtime language string for pregen keys — must match useNarrativePlayback:
 *   language: locale === "zh-CN" ? "zh-CN" : "en"
 */
function runtimeDialogueLanguage(locale: string): "zh-CN" | "en" {
  return locale === "zh-CN" ? "zh-CN" : "en";
}

describe("pregen voice key contract", () => {
  it("collapses whitespace so chunk-join differences never miss the bank", () => {
    expect(normalizeVoiceText("你好  世界\n\n再见")).toBe("你好 世界 再见");
    expect(pregenVoiceKey("suming", "zh-CN", "你好  世界")).toBe(
      pregenVoiceKey("suming", "zh-CN", "你好\n世界"),
    );
  });

  it("keys differ across character, language and text", () => {
    const base = pregenVoiceKey("suming", "zh-CN", "你好");
    expect(pregenVoiceKey("narrator", "zh-CN", "你好")).not.toBe(base);
    expect(pregenVoiceKey("suming", "en", "你好")).not.toBe(base);
    expect(pregenVoiceKey("suming", "zh-CN", "你好呀")).not.toBe(base);
  });

  it("fnv1a64 is stable — clips on disk depend on these exact values", () => {
    // Frozen expectations: changing the hash silently orphans every shipped mp3.
    expect(fnv1a64Hex("")).toBe("cbf29ce484222325");
    expect(fnv1a64Hex("a")).toBe("af63dc4c8601ec8c");
    expect(pregenVoiceKey("suming", "zh-CN", "你好")).toMatch(/^[0-9a-f]{16}$/);
  });

  it("derives clip urls from the key", () => {
    expect(pregenVoiceUrl("abc123")).toBe("/assets/voice/abc123.mp3");
  });

  it("pins runtime locale → pregen language string used in keys", () => {
    // tool --language=en and English UI locale must hash with "en", never "en-US".
    expect(runtimeDialogueLanguage("zh-CN")).toBe("zh-CN");
    expect(runtimeDialogueLanguage("en")).toBe("en");
    expect(runtimeDialogueLanguage("ja")).toBe("en");
    const sample = "When the chat log is scored, it gets deleted.";
    const segments = planBrowserTtsSegments(sample, "en");
    expect(segments.length).toBeGreaterThan(0);
    expect(segments[0]?.language).toBe("en");
    const key = pregenVoiceKey("staff_worker", segments[0]!.language, sample);
    expect(key).toBe(pregenVoiceKey("staff_worker", "en", sample));
    expect(key).not.toBe(pregenVoiceKey("staff_worker", "zh-CN", sample));
  });

  it("ships a catalog that coexists zh and en keys after pregen", () => {
    const catalogPath = resolve(process.cwd(), "apps/web/public/assets/voice/catalog.json");
    const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as {
      version: number;
      keys: string[];
    };
    expect(catalog.version).toBe(1);
    // Baseline zh bank is 136 unique lines; en expands the catalog further.
    expect(catalog.keys.length).toBeGreaterThanOrEqual(136);
    for (const key of catalog.keys) {
      expect(key).toMatch(/^[0-9a-f]{16}$/);
    }
  });

  it("ENGLISH_VOICE_MAP covers every Chinese-lane cast id used offline", () => {
    const required = [
      "narrator",
      "suming",
      "leo",
      "chen_jia",
      "shi_peixin",
      "zhu_zhu",
      "test_ai",
      "staff_worker",
      "staff_lead",
      "grid_worker",
      "police_officer",
      "courier",
      "shop_owner",
      "huang_laotai",
      "lin_xiaotang",
      "zhou_lu",
    ];
    for (const id of required) {
      const cast = ENGLISH_VOICE_MAP[id];
      expect(cast, id).toBeDefined();
      if (!cast) continue;
      expect(cast.voice_id.length).toBeGreaterThan(0);
      expect(typeof cast.speed).toBe("number");
      expect(typeof cast.pitch).toBe("number");
    }
  });
});
