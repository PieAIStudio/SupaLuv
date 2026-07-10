import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  AUTOSAVE_SLOT,
  EMPTY_UNLOCKS,
  collectAllUnlocks,
  findLatestSave,
  listSaveSlots,
  loadSave,
  mergeUnlocks,
  presentationFromSnapshot,
  restoreSnapshotFromSave,
  writeSave,
  type GameSavePayload,
} from "../../apps/web/src/persistence/gameSave";

function installMemoryLocalStorage() {
  const store = new Map<string, string>();
  const memory = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: memory,
    configurable: true,
    writable: true,
  });
}

beforeAll(() => {
  installMemoryLocalStorage();
});

function makeSave(overrides: Partial<GameSavePayload> = {}): GameSavePayload {
  return {
    version: 1,
    slotId: AUTOSAVE_SLOT,
    storyId: "ch01",
    inkStateJson: "{}",
    label: "第01章",
    savedAt: "2026-07-10T00:00:00.000Z",
    unlocks: EMPTY_UNLOCKS,
    chapterHint: "ch01_office_night",
    ...overrides,
  };
}

afterEach(() => {
  localStorage.clear();
});

describe("gameSave", () => {
  it("writes and loads a slot", () => {
    writeSave(makeSave());
    const loaded = loadSave(AUTOSAVE_SLOT);
    expect(loaded?.storyId).toBe("ch01");
    expect(loaded?.chapterHint).toBe("ch01_office_night");
  });

  it("rejects wrong version", () => {
    localStorage.setItem(
      "supaluv.save.v1.autosave",
      JSON.stringify({ ...makeSave(), version: 99 }),
    );
    expect(loadSave(AUTOSAVE_SLOT)).toBeNull();
  });

  it("lists and finds latest by savedAt", () => {
    writeSave(makeSave({ slotId: "slot-1", savedAt: "2026-07-01T00:00:00.000Z" }));
    writeSave(makeSave({ slotId: "slot-2", savedAt: "2026-07-09T00:00:00.000Z" }));
    const list = listSaveSlots();
    expect(list[0]?.slotId).toBe("slot-2");
    expect(findLatestSave()?.slotId).toBe("slot-2");
  });

  it("merges unlocks uniquely", () => {
    const merged = mergeUnlocks(
      { images: ["a"], videos: [], audio: ["x"] },
      { images: ["a", "b"], videos: ["v1"], audio: ["x", "y"] },
    );
    expect(merged.images).toEqual(["a", "b"]);
    expect(merged.videos).toEqual(["v1"]);
    expect(merged.audio).toEqual(["x", "y"]);
  });

  it("collects unlocks across slots", () => {
    writeSave(
      makeSave({
        slotId: "slot-1",
        unlocks: { images: ["bg-office-night"], videos: [], audio: [] },
      }),
    );
    writeSave(
      makeSave({
        slotId: "slot-2",
        unlocks: { images: [], videos: ["ch01-cold-open"], audio: ["soft-piano"] },
      }),
    );
    expect(collectAllUnlocks()).toEqual({
      images: ["bg-office-night"],
      videos: ["ch01-cold-open"],
      audio: ["soft-piano"],
    });
  });

  it("restores blank ink presentation from saved snapshot", () => {
    const presentation = presentationFromSnapshot({
      sceneId: "ch01_office_delete_or_shot",
      text: "保存时看到的台词",
      choices: [{ index: 0, text: "立刻删掉" }],
      isEnded: false,
      meters: { dignity: 48, impulse: 55 },
    });
    writeSave(makeSave({ presentation }));
    const loaded = loadSave(AUTOSAVE_SLOT);
    const inkBlank = {
      sceneId: null,
      text: "",
      choices: [{ index: 0, text: "立刻删掉" }],
      isEnded: false,
      meters: { dignity: 48, impulse: 55 },
    };
    const restored = restoreSnapshotFromSave(inkBlank, loaded?.presentation);
    expect(restored.sceneId).toBe("ch01_office_delete_or_shot");
    expect(restored.text).toContain("台词");
    expect(restored.choices[0]?.text).toContain("删掉");
  });
});
