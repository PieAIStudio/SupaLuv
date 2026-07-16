import { describe, expect, it } from "vitest";
import {
  captureMetaReturnScreen,
  resolveBackFromMeta,
  type AppScreen,
} from "../../apps/web/src/app/screenRouting";

describe("captureMetaReturnScreen", () => {
  it("records play when leaving from play", () => {
    expect(captureMetaReturnScreen("play")).toBe("play");
  });

  it("records title for every non-play screen", () => {
    const nonPlay: AppScreen[] = [
      "title",
      "character-studio",
      "gallery",
      "settings",
      "help",
      "achievements",
      "ai-spend",
    ];
    for (const screen of nonPlay) {
      expect(captureMetaReturnScreen(screen)).toBe("title");
    }
  });
});

describe("resolveBackFromMeta", () => {
  it("returns play only when marker is play and runner exists", () => {
    expect(resolveBackFromMeta("play", true)).toBe("play");
    expect(resolveBackFromMeta("play", false)).toBe("title");
    expect(resolveBackFromMeta("title", true)).toBe("title");
    expect(resolveBackFromMeta("title", false)).toBe("title");
  });
});
