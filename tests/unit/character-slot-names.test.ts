import { describe, expect, it } from "vitest";
import { CHARACTER_SLOTS } from "../../packages/content/characters/slots";
import { LEAD_SLOTS } from "../../apps/web/src/views/CharacterStudioScreen";

/**
 * The casting studio keeps a local slot table for UI concerns; the canonical
 * slot registry lives in packages/content. They drifted once (studio showed
 * the retired name 周鹿 while the story cast 石佩欣) — this contract keeps
 * every duplicated field aligned until the tables are unified.
 */
describe("character slot name contract", () => {
  it("studio lead slots match the canonical content slot names", () => {
    for (const lead of LEAD_SLOTS) {
      const canonical = CHARACTER_SLOTS.find((slot) => slot.id === lead.id);
      expect(canonical, `missing canonical slot for ${lead.id}`).toBeDefined();
      expect(lead.name, `displayName drift for ${lead.id}`).toBe(canonical?.displayName);
    }
  });
});
