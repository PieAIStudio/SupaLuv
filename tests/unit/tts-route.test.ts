import { describe, expect, it } from "vitest";
import { resolveTtsRoute } from "@pieai/swimmer-ai-kit/tts";

describe("dual TTS route (SwimmerAIKit)", () => {
  it("sends chinese locales to chinese lane", () => {
    expect(resolveTtsRoute("zh-CN")).toBe("chinese");
    expect(resolveTtsRoute("zh")).toBe("chinese");
  });

  it("sends western locales to elevenlabs lane", () => {
    expect(resolveTtsRoute("en")).toBe("western");
    expect(resolveTtsRoute("en-US")).toBe("western");
    expect(resolveTtsRoute("fr-FR")).toBe("western");
  });
});
