import { describe, expect, it } from "vitest";
import { classifyBed, isSceneCueSfx } from "../../apps/web/src/audio/gameAudio";

describe("gameAudio helpers", () => {
  it("classifies melodic beds as music", () => {
    expect(classifyBed("soft-piano")).toBe("music");
    expect(classifyBed("title-theme")).toBe("music");
    expect(classifyBed("chapter-end")).toBe("music");
  });

  it("classifies Lyria scene beds as exclusive music (no dual-stack)", () => {
    expect(classifyBed("night-ambient")).toBe("music");
    expect(classifyBed("lonely-pad")).toBe("music");
    expect(classifyBed("title-theme")).toBe("music");
  });

  it("treats notify and payment as scene cues", () => {
    expect(isSceneCueSfx("notify-soft")).toBe(true);
    expect(isSceneCueSfx("payment-chime")).toBe(true);
    expect(isSceneCueSfx("ui-click")).toBe(false);
  });
});
