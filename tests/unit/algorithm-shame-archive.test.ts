import { beforeEach, describe, expect, it } from "vitest";
import {
  ALGORITHM_SHAME_ARCHIVE,
  ALGORITHM_SHAME_ARCHIVE_RECORD_IDS,
  archiveIdsForScene,
} from "../../apps/web/src/persistence/algorithmShameArchive";
import {
  EMPTY_UNLOCKS,
  loadSave,
  mergeUnlocks,
  normalizeUnlocks,
  writeSave,
  type GameSavePayload,
} from "../../apps/web/src/persistence/gameSave";
import { unlockCount, unlocksFromScene } from "../../apps/web/src/persistence/sceneUnlocks";

const memory = new Map<string, string>();

beforeEach(() => {
  memory.clear();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
      clear: () => memory.clear(),
      key: (index: number) => [...memory.keys()][index] ?? null,
      get length() {
        return memory.size;
      },
    },
  });
});

describe("algorithm shame archive catalog", () => {
  it("ships the five authored record IDs", () => {
    expect([...ALGORITHM_SHAME_ARCHIVE_RECORD_IDS].sort()).toEqual([
      "application-nda",
      "approval-sms",
      "barcode-shift",
      "protocol-terms",
      "rental-receipt",
    ]);
    expect(ALGORITHM_SHAME_ARCHIVE).toHaveLength(5);
  });

  it("maps authored scenes and interactions to archive unlocks", () => {
    expect(archiveIdsForScene("dch01_protocol_test")).toContain("protocol-terms");
    expect(archiveIdsForScene("dch02_barcode_sweep")).toContain("barcode-shift");
    expect(archiveIdsForScene("dch02_s020")).toContain("rental-receipt");
    expect(archiveIdsForScene("dch02_s037")).toContain("application-nda");
    expect(archiveIdsForScene("dch02_s039")).toContain("approval-sms");
    expect(archiveIdsForScene("unknown")).toEqual([]);
  });
});

describe("GalleryUnlocks archive compatibility", () => {
  it("defaults missing archive on old unlock objects", () => {
    expect(normalizeUnlocks({ images: ["a"], videos: [], audio: [] })).toEqual({
      images: ["a"],
      videos: [],
      audio: [],
      archive: [],
    });
    expect(EMPTY_UNLOCKS.archive).toEqual([]);
  });

  it("merges archive uniquely and counts it", () => {
    const merged = mergeUnlocks(
      { images: [], videos: [], audio: [], archive: ["protocol-terms"] },
      { archive: ["protocol-terms", "barcode-shift"] },
    );
    expect(merged.archive).toEqual(["protocol-terms", "barcode-shift"]);
    expect(unlockCount(merged)).toBe(2);
  });

  it("loads old saves without archive field", () => {
    const legacy: GameSavePayload = {
      version: 2,
      slotId: "slot-legacy-archive",
      storyId: "draft-ch01",
      inkStateJson: "{}",
      label: "legacy",
      savedAt: "2026-07-01T00:00:00.000Z",
      unlocks: { images: ["bg-office-night"], videos: [], audio: ["night-ambient"] },
    };
    // Simulate pre-archive save JSON by writing raw storage without normalize.
    localStorage.setItem("supaluv.save.v1.slot-legacy-archive", JSON.stringify(legacy));
    const loaded = loadSave("slot-legacy-archive");
    expect(loaded?.unlocks.archive).toEqual([]);
    expect(loaded?.unlocks.images).toEqual(["bg-office-night"]);
    expect(loaded?.unlocks.audio).toEqual(["night-ambient"]);
  });

  it("persists archive unlocks on write/load", () => {
    writeSave({
      version: 2,
      slotId: "slot-archive-new",
      storyId: "draft-ch02",
      inkStateJson: "{}",
      label: "with archive",
      savedAt: "2026-07-14T00:00:00.000Z",
      unlocks: {
        images: [],
        videos: [],
        audio: [],
        archive: ["rental-receipt", "approval-sms"],
      },
    });
    expect(loadSave("slot-archive-new")?.unlocks.archive).toEqual([
      "rental-receipt",
      "approval-sms",
    ]);
  });

  it("includes archive ids from unlocksFromScene for known scenes", async () => {
    const { loadStoryChapter } = await import("@supaluv/content");
    await loadStoryChapter("draft-ch01");
    const partial = unlocksFromScene("draft-ch01", "dch01_protocol_test");
    expect(partial.archive).toContain("protocol-terms");
  });
});
