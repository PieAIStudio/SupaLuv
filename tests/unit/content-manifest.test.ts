import { describe, expect, it } from "vitest";
import { CHARACTER_SLOTS, productionStoryCatalog, superLoverSeedManifest } from "@supaluv/content";
import { draftCh01Scenes } from "@supaluv/content/draft-ch01-scenes";
import { draftCh02Scenes } from "@supaluv/content/draft-ch02-scenes";
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
  it("keeps robot slots registered without binding retired ch01 product page", () => {
    for (const slotId of ["robot_aila", "robot_kai"] as const) {
      const slot = CHARACTER_SLOTS.find((item) => item.id === slotId);
      expect(slot?.kind).toBe("robot");
      expect(slot?.lockPoint).toEqual({
        kind: "deferred_story_knot",
        reason: "Awaiting the authored robot-selection scene in a later chapter.",
      });
    }
    // Draft scenes intentionally do not force robot selection mid-chapter.
    expect(draftCh01Scenes.every((scene) => !("characterSlotLock" in scene))).toBe(true);
    expect(draftCh02Scenes.every((scene) => !("characterSlotLock" in scene))).toBe(true);
  });
});

describe("human-video removal", () => {
  it("keeps draft chapters still-first with no authored video references", () => {
    expect(draftCh01Scenes.every((scene) => !("videoKey" in scene))).toBe(true);
    expect(draftCh02Scenes.every((scene) => !("videoKey" in scene))).toBe(true);
    expect(productionStoryCatalog.map((s) => s.id)).toEqual(["draft-ch01", "draft-ch02"]);
  });
});
