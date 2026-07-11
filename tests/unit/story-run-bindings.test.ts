import { describe, expect, it } from "vitest";
import {
  bindingFromPack,
  lockCharacterSlot,
  refreshCharacterBindingUrls,
} from "../../apps/web/src/characters/storyRunBindings";

describe("story run character bindings", () => {
  it("snapshots an accepted pack and does not follow later pack changes", () => {
    const pack = {
      id: "pack-1",
      slotId: "lead_suming",
      kind: "human" as const,
      status: "active" as const,
      baseAsset: { id: "base-1", url: "https://signed/base-1", mimeType: "image/png" },
      moodAssets: {
        happy: {
          id: "happy-1",
          url: "https://signed/happy-1",
          mimeType: "image/png",
          moodKey: "happy" as const,
        },
      },
    };
    const binding = bindingFromPack(pack, "2026-07-12T00:00:00.000Z");
    const locked = lockCharacterSlot({}, binding);
    const later = { ...binding, packId: "pack-2", baseUrl: "https://signed/base-2" };

    expect(lockCharacterSlot(locked, later)).toBe(locked);
    expect(locked.lead_suming).toMatchObject({
      packId: "pack-1",
      baseUrl: "https://signed/base-1",
    });
  });

  it("refreshes expiring signed URLs without changing the locked pack identity", async () => {
    const bindings = {
      lead_suming: {
        slotId: "lead_suming",
        packId: "pack-1",
        baseUrl: "https://expired/base",
        moodUrls: { happy: "https://expired/happy" },
        lockedAt: "2026-07-12T00:00:00.000Z",
      },
      lead_zhou_lu: {
        slotId: "lead_zhou_lu",
        packId: "official:lead_zhou_lu",
        baseUrl: "/assets/portraits/zhou-neutral.png",
        moodUrls: {},
        lockedAt: "2026-07-12T00:00:00.000Z",
      },
    } as const;

    const refreshed = await refreshCharacterBindingUrls(bindings, async () => ({
      assets: [
        { assetKind: "base", url: "https://fresh/base" },
        { assetKind: "mood", moodKey: "happy", url: "https://fresh/happy" },
      ],
    }));

    expect(refreshed.lead_suming).toMatchObject({
      packId: "pack-1",
      baseUrl: "https://fresh/base",
      moodUrls: { happy: "https://fresh/happy" },
      lockedAt: bindings.lead_suming.lockedAt,
    });
    expect(refreshed.lead_zhou_lu).toBe(bindings.lead_zhou_lu);
  });
});
