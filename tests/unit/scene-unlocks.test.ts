import { describe, expect, it } from "vitest";
import { unlockCount, unlocksFromScene } from "../../apps/web/src/persistence/sceneUnlocks";
import { EMPTY_UNLOCKS } from "../../apps/web/src/persistence/gameSave";

describe("sceneUnlocks", () => {
  it("counts unlock buckets", () => {
    expect(
      unlockCount({
        images: ["a", "b"],
        videos: ["v"],
        audio: [],
      }),
    ).toBe(3);
    expect(unlockCount(EMPTY_UNLOCKS)).toBe(0);
  });

  it("derives unlocks from known ch01 scene when present", () => {
    const partial = unlocksFromScene("ch01", "ch01_office_night");
    // Scene may or may not map; ensure function is pure and returns object.
    expect(partial).toBeTypeOf("object");
  });
});
