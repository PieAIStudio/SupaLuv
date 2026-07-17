import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  AUTOSAVE_SLOT,
  EMPTY_UNLOCKS,
  collectAllUnlocks,
  evaluateSaveCompatibility,
  findLatestSave,
  listSaveSlots,
  loadSave,
  mergeUnlocks,
  presentationFromSnapshot,
  restoreSnapshotFromSave,
  writeSave,
  type GameSavePayload,
} from "../../apps/web/src/persistence/gameSave";
import { writeStorySave } from "../../apps/web/src/persistence/saveWriter";
import { createDraftCh02InkStoryRunner } from "../../apps/web/src/story/inkStoryRunner";

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
    version: 3,
    slotId: AUTOSAVE_SLOT,
    storyId: "draft-ch01",
    packageId: "draft-2026-07",
    inkStateJson: "{}",
    label: "第01章 · 你有病吧",
    savedAt: "2026-07-10T00:00:00.000Z",
    unlocks: EMPTY_UNLOCKS,
    chapterHint: "dch01_s001",
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
    expect(loaded?.storyId).toBe("draft-ch01");
    expect(loaded?.chapterHint).toBe("dch01_s001");
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
      archive: [],
    });
  });

  it("restores blank ink presentation from saved snapshot", () => {
    const presentation = presentationFromSnapshot({
      sceneId: "dch01_s003",
      tags: ["scene:dch01_s003"],
      text: "保存时看到的台词",
      choices: [{ index: 0, text: "点头：至少说人话了", choiceId: "d1_bones_accept" }],
      isEnded: false,
      meters: { mianzi: 48, ai_score: 55 },
    });
    writeSave(makeSave({ presentation }));
    const loaded = loadSave(AUTOSAVE_SLOT);
    const inkBlank = {
      sceneId: null,
      tags: [],
      text: "",
      choices: [{ index: 0, text: "点头：至少说人话了", choiceId: "d1_bones_accept" }],
      isEnded: false,
      meters: { mianzi: 48, ai_score: 55 },
    };
    const restored = restoreSnapshotFromSave(inkBlank, loaded?.presentation);
    expect(restored.sceneId).toBe("dch01_s003");
    expect(restored.tags).toEqual(["scene:dch01_s003"]);
    expect(restored.text).toContain("台词");
    expect(restored.choices[0]?.text).toContain("说人话");
  });

  it("flags retired ch01 saves as incompatible", () => {
    const result = evaluateSaveCompatibility(
      makeSave({ version: 1, storyId: "ch01", label: "旧 Demo" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("retired");
      expect(result.message).toMatch(/退休|不兼容/);
    }
  });

  it("persists inherited chapter variables for refresh recovery", async () => {
    const runner = await createDraftCh02InkStoryRunner({ mianzi: 61, clue_subsidy_sms: true });
    writeStorySave({
      runner,
      storyId: "draft-ch02",
      unlocks: EMPTY_UNLOCKS,
      slotId: AUTOSAVE_SLOT,
      inheritedVariables: { mianzi: 61, clue_subsidy_sms: true },
    });
    expect(loadSave(AUTOSAVE_SLOT)?.inheritedVariables).toEqual({
      mianzi: 61,
      clue_subsidy_sms: true,
    });
  });
});
