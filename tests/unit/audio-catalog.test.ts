import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AUDIO_BED_CATALOG,
  AUDIO_SFX_CATALOG,
  listAudioCatalogIds,
} from "../../apps/web/src/audio/audioCatalog";

describe("release audio catalog", () => {
  it("uses unique stable IDs with explicit loop, fade, repeat, and scene-cue policy", () => {
    const ids = listAudioCatalogIds();
    expect(new Set(ids.beds).size).toBe(ids.beds.length);
    expect(new Set(ids.sfx).size).toBe(ids.sfx.length);
    expect(
      AUDIO_BED_CATALOG.every((entry) => entry.loop && entry.fadeInMs > 0 && entry.fadeOutMs > 0),
    ).toBe(true);
    expect(AUDIO_SFX_CATALOG.map(({ id, repeat, sceneCue }) => ({ id, repeat, sceneCue }))).toEqual(
      [
        { id: "ui-click", repeat: "overlap", sceneCue: false },
        { id: "ui-choice", repeat: "overlap", sceneCue: false },
        { id: "notify-soft", repeat: "restart", sceneCue: true },
        { id: "payment-chime", repeat: "restart", sceneCue: true },
      ],
    );
  });

  it("resolves every catalog URL to a real local public asset", () => {
    for (const entry of [...AUDIO_BED_CATALOG, ...AUDIO_SFX_CATALOG]) {
      expect(entry.src.startsWith("/assets/audio/")).toBe(true);
      expect(existsSync(resolve("apps/web/public", entry.src.slice(1)))).toBe(true);
    }
  });
});
