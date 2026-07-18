import { describe, expect, it } from "vitest";
import {
  fnv1a64Hex,
  normalizeVoiceText,
  pregenVoiceKey,
  pregenVoiceUrl,
} from "../../apps/web/src/audio/pregenVoice";

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
});
