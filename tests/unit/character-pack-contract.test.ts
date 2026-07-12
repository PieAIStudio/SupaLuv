import { CHARACTER_SLOTS, INITIAL_CHARACTER_MOODS } from "@supaluv/content";
import type { CharacterPack, CharacterSlotDefinition } from "@supaluv/shared";
import { describe, expect, expectTypeOf, it } from "vitest";

describe("character pack domain contract", () => {
  it("declares the current four story-owned customization slots", () => {
    expect(CHARACTER_SLOTS.map((slot) => slot.id)).toEqual([
      "lead_suming",
      "lead_zhou_lu",
      "robot_aila",
      "robot_kai",
    ]);
    expect(CHARACTER_SLOTS.every((slot) => slot.requiredMoodKeys.length === 6)).toBe(true);
    expect(INITIAL_CHARACTER_MOODS).toEqual([
      "neutral",
      "happy",
      "awkward",
      "angry",
      "surprised",
      "sad",
    ]);
  });

  it("locks leads before a run and robots only at authored selection points", () => {
    const leads = CHARACTER_SLOTS.filter((slot) => slot.kind === "human");
    const robots = CHARACTER_SLOTS.filter((slot) => slot.kind === "robot");

    expect(leads).toHaveLength(2);
    expect(leads.every((slot) => slot.lockPoint.kind === "before_new_game")).toBe(true);
    expect(robots).toHaveLength(2);
    expect(robots.every((slot) => slot.lockPoint.kind === "deferred_story_knot")).toBe(true);
  });

  it("keeps packs JSON-serializable and provider-independent", () => {
    const fixture: CharacterPack = {
      id: "pack-1",
      ownerId: "user-1",
      slotId: "lead_suming",
      status: "active",
      brief: "A tired adult programmer with dry comic timing.",
      references: [],
      baseAsset: {
        id: "asset-base",
        kind: "base",
        mimeType: "image/webp",
        url: "https://example.invalid/base.webp",
      },
      moodAssets: {},
      moderation: { input: "adult", output: "allowed" },
      provenance: { provider: "fixture", model: "fixture-v1" },
      createdAt: "2026-07-11T00:00:00.000Z",
      lastUsedAt: "2026-07-11T00:00:00.000Z",
    };

    expect(JSON.parse(JSON.stringify(fixture))).toEqual(fixture);
    expectTypeOf<CharacterSlotDefinition["kind"]>().toEqualTypeOf<"human" | "robot">();
  });
});
