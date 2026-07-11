import { describe, expect, it } from "vitest";
import { CHARACTER_SLOTS, ch01Scenes, superLoverSeedManifest } from "@supaluv/content";
import { isReadonlySourceMaterial } from "@supaluv/shared";

describe("superLoverSeedManifest", () => {
  it("keeps the source outline as read-only provenance", () => {
    expect(superLoverSeedManifest.sourceMaterial.ipTitle).toBe("超级爱人");
    expect(superLoverSeedManifest.sourceMaterial.projectPath).toBe(
      "docs/reference/source-material/super-lover-outline.md",
    );
    expect(isReadonlySourceMaterial(superLoverSeedManifest.sourceMaterial)).toBe(true);
  });

  it("keeps P0 runtime scope small", () => {
    expect(superLoverSeedManifest.runtimeBaseline).toBe("react-inkjs");
    expect(superLoverSeedManifest.boundary.publicRuntimeAi).toBe("out-of-scope-for-p0");
    expect(superLoverSeedManifest.boundary.multiplayer).toBe("not-applicable");
  });
});

describe("character slot lock manifest", () => {
  it("declares both robot slots at the authored product-selection scene", () => {
    const scene = ch01Scenes.find((item) => item.id === "ch01_product_page");
    expect(scene?.characterSlotLock?.slotIds).toEqual(["robot_aila", "robot_kai"]);
    for (const slotId of scene?.characterSlotLock?.slotIds ?? []) {
      const slot = CHARACTER_SLOTS.find((item) => item.id === slotId);
      expect(slot?.kind).toBe("robot");
      expect(slot?.lockPoint).toEqual({
        kind: "story_knot",
        storyId: "ch01",
        knotId: "ch01_product_page",
      });
    }
  });
});

describe("human-video removal", () => {
  it("keeps Chapter 1 still-first with no authored video references", () => {
    expect(ch01Scenes.every((scene) => !("videoKey" in scene))).toBe(true);
  });
});
