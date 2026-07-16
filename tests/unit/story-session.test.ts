import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTOSAVE_SLOT,
  EMPTY_UNLOCKS,
  evaluateSaveCompatibility,
  loadSave,
  MANUAL_SLOTS,
  presentationFromSnapshot,
  SAVE_VERSION,
  writeSave,
  type GameSavePayload,
  type GalleryUnlocks,
} from "../../apps/web/src/persistence/gameSave";
import { createStorySession } from "../../apps/web/src/story/session/createStorySession";
import type { StoryRuntime } from "../../apps/web/src/story/session/storyRuntime";
import type { StorySession } from "../../apps/web/src/story/session/types";
import type { InkStoryRunner, InkStorySnapshot } from "../../apps/web/src/story/inkStoryRunner";
import type { StoryCharacterBindings } from "../../apps/web/src/characters/characterPackTypes";
import type { StoryId } from "../../apps/web/src/story/storyMapAdapter";
import type { PortraitPackState } from "../../apps/web/src/persistence/portraitPack";

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

afterEach(() => {
  localStorage.clear();
});

function snapshot(partial: Partial<InkStorySnapshot> = {}): InkStorySnapshot {
  return {
    sceneId: "dch01_s001",
    tags: ["scene:dch01_s001"],
    text: "opening line",
    choices: [{ index: 0, text: "go", choiceId: "c0" }],
    isEnded: false,
    meters: { dignity: 50, impulse: 50 },
    ...partial,
  };
}

function makeRunner(initial: InkStorySnapshot = snapshot()): InkStoryRunner {
  let current = initial;
  const variables: Record<string, unknown> = {
    dignity: initial.meters.dignity,
    impulse: initial.meters.impulse,
    clue_subsidy_sms: false,
  };
  return {
    getSnapshot: () => current,
    exportStateJson: () => JSON.stringify({ path: current.sceneId, variables }),
    getVariable: (name: string) => variables[name],
    applyVariables: (values: Readonly<Record<string, unknown>>) => {
      Object.assign(variables, values);
      current = {
        ...current,
        meters: {
          dignity: Number(variables.dignity ?? 50),
          impulse: Number(variables.impulse ?? 50),
        },
      };
    },
    exportVariables: (names: readonly string[]) => {
      const out: Record<string, unknown> = {};
      for (const name of names) {
        out[name] = variables[name];
      }
      return out;
    },
    choose: (index: number) => {
      current = snapshot({
        sceneId: `chosen-${index}`,
        tags: [`scene:chosen-${index}`],
        text: `after choice ${index}`,
        choices: [],
        isEnded: false,
        meters: {
          dignity: Number(variables.dignity ?? 50),
          impulse: Number(variables.impulse ?? 50),
        },
      });
      return current;
    },
    jumpTo: (path: string) => {
      current = snapshot({
        sceneId: path,
        tags: [`scene:${path}`],
        text: `jumped to ${path}`,
        choices: [],
      });
      return current;
    },
  } as unknown as InkStoryRunner;
}

function makeRuntime(options?: {
  readonly unlocksForScene?: Partial<GalleryUnlocks>;
  readonly nextChapterId?: string | null;
  readonly inheritVariableNames?: readonly string[];
  readonly runtimeTag?: string;
  readonly createRunner?: (
    storyId: string,
    savedStateJson?: string,
    inherited?: Readonly<Record<string, unknown>>,
  ) => Promise<InkStoryRunner>;
}): StoryRuntime {
  const unlocksForScene = options?.unlocksForScene ?? {
    images: ["bg-office-night"],
    audio: ["soft-piano"],
  };
  const runtimeTag = options?.runtimeTag ?? "default";
  const writeCalls: Array<{ slotId: string; tag: string; imageUnlock?: string }> = [];

  const createRunner =
    options?.createRunner ??
    (async (
      storyId: string,
      savedStateJson?: string,
      inherited?: Readonly<Record<string, unknown>>,
    ) => {
      // When restoring from save, Ink often yields blank presentation at a choice
      // boundary; restoreSnapshotFromSave fills from the saved presentation.
      const runner = makeRunner(
        savedStateJson
          ? snapshot({
              sceneId: null,
              tags: [],
              text: "",
              choices: [],
            })
          : snapshot({
              sceneId: storyId === "draft-ch02" ? "dch02_s001" : "dch01_s001",
              tags: [storyId === "draft-ch02" ? "scene:dch02_s001" : "scene:dch01_s001"],
            }),
      );
      if (inherited) {
        runner.applyVariables(inherited);
      }
      return runner;
    });

  const runtime = {
    createInkStoryRunnerForId: createRunner,
    unlocksFromScene: (_storyId: StoryId, sceneId: string | null) => {
      if (!sceneId) {
        return {};
      }
      // Tag unlocks so choose/jump proves which runtime adapter ran.
      return {
        ...unlocksForScene,
        images: [...(unlocksForScene.images ?? []), `runtime-${runtimeTag}`],
      };
    },
    getStoryDefinition: (storyId: StoryId) => ({
      id: storyId,
      label: storyId,
      packageId: "draft-2026-07",
      inheritVariableNames: options?.inheritVariableNames ?? ["dignity", "clue_subsidy_sms"],
      checkpoint:
        options?.nextChapterId === null
          ? { kind: "ai_final" as const }
          : {
              kind: "next_chapter" as const,
              nextChapterId: options?.nextChapterId ?? "draft-ch02",
            },
      scenes: [],
      compiledStoryJson: "{}",
    }),
    getChapterCheckpoint: (_storyId: StoryId) =>
      (options?.nextChapterId === null
        ? { kind: "ai_final" as const }
        : {
            kind: "next_chapter" as const,
            nextChapterId: options?.nextChapterId ?? "draft-ch02",
          }) as ReturnType<StoryRuntime["getChapterCheckpoint"]>,
    getStoryScene: () => null,
    writeStorySave: (input: {
      readonly runner: InkStoryRunner;
      readonly storyId: StoryId;
      readonly unlocks: GalleryUnlocks;
      readonly slotId: string;
      readonly chapterHint?: string;
      readonly presentationSnapshot?: InkStorySnapshot;
      readonly characterBindings?: StoryCharacterBindings;
      readonly inheritedVariables?: Readonly<Record<string, unknown>>;
    }) => {
      writeCalls.push({
        slotId: input.slotId,
        tag: runtimeTag,
        imageUnlock: input.unlocks.images.find((id) => id.startsWith("runtime-")),
      });
      const presentation = presentationFromSnapshot(
        input.presentationSnapshot ?? input.runner.getSnapshot(),
      );
      writeSave({
        version: SAVE_VERSION,
        slotId: input.slotId,
        storyId: input.storyId,
        packageId: "draft-2026-07",
        inkStateJson: input.runner.exportStateJson(),
        label: String(input.storyId),
        savedAt: new Date().toISOString(),
        unlocks: input.unlocks,
        chapterHint: input.chapterHint ?? presentation.sceneId ?? undefined,
        presentation,
        ...(input.characterBindings ? { characterBindings: input.characterBindings } : {}),
        ...(input.inheritedVariables ? { inheritedVariables: input.inheritedVariables } : {}),
      });
      return presentation;
    },
    __writeCalls: writeCalls,
    __runtimeTag: runtimeTag,
  };
  return runtime as unknown as StoryRuntime & {
    __writeCalls: typeof writeCalls;
    __runtimeTag: string;
  };
}

function makeSave(overrides: Partial<GameSavePayload> = {}): GameSavePayload {
  return {
    version: 2,
    slotId: AUTOSAVE_SLOT,
    storyId: "draft-ch01",
    packageId: "draft-2026-07",
    inkStateJson: JSON.stringify({ path: "dch01_s001" }),
    label: "第01章 · 你有病吧",
    savedAt: "2026-07-10T00:00:00.000Z",
    unlocks: { images: ["bg-office-night"], videos: [], audio: [] },
    chapterHint: "dch01_s001",
    presentation: {
      sceneId: "dch01_s001",
      tags: ["scene:dch01_s001"],
      text: "saved line",
      choices: [{ index: 0, text: "go", choiceId: "c0" }],
      isEnded: false,
      meters: { dignity: 50, impulse: 50 },
    },
    ...overrides,
  };
}

const sampleBindings: StoryCharacterBindings = {
  lead_suming: {
    slotId: "lead_suming",
    packId: "pack-1",
    baseUrl: "https://example.test/base.png",
    moodUrls: {},
    lockedAt: "2026-07-10T00:00:00.000Z",
  },
};

describe("StorySession", () => {
  let session: StorySession;
  let runtime: StoryRuntime;
  let preloadCalls: Array<{ storyId: string; sceneId: string | null }>;
  let unlockAnnouncements: number[];

  beforeEach(() => {
    runtime = makeRuntime();
    preloadCalls = [];
    unlockAnnouncements = [];
    session = createStorySession({
      initialUnlocks: EMPTY_UNLOCKS,
      loadRuntime: async () => runtime,
      preloadPresentation: async (_rt, storyId, sceneId) => {
        preloadCalls.push({ storyId, sceneId });
      },
      onUnlocksGained: (gained) => {
        unlockAnnouncements.push(gained);
      },
    });
  });

  it("startNew loads default story, applies first-scene unlocks, and autosaves bindings", async () => {
    await session.startNew(sampleBindings);
    const state = session.getState();
    expect(state.storyId).toBe("draft-ch01");
    expect(state.runner).not.toBeNull();
    expect(state.snapshot?.sceneId).toBe("dch01_s001");
    expect(state.characterBindings).toEqual(sampleBindings);
    expect(state.unlocks.images).toContain("bg-office-night");
    expect(state.revision).toBe(1);
    expect(state.continueBlockedMessage).toBeNull();
    expect(preloadCalls).toHaveLength(1);

    const autosave = loadSave(AUTOSAVE_SLOT);
    expect(autosave?.storyId).toBe("draft-ch01");
    expect(autosave?.characterBindings).toEqual(sampleBindings);
    expect(unlockAnnouncements[0]).toBeGreaterThan(0);
  });

  it("supplied bindings are observable and autosaved (host reuses current; solo supplies new)", async () => {
    // Host path: pass through current session bindings (App: startNew(getState().bindings)).
    session.updateCharacterBindings(sampleBindings);
    await session.startNew(session.getState().characterBindings);
    expect(session.getState().characterBindings).toEqual(sampleBindings);
    expect(loadSave(AUTOSAVE_SLOT)?.characterBindings).toEqual(sampleBindings);

    // Solo casting path: pass newly selected bindings.
    const cast: StoryCharacterBindings = {
      lead_zhou_lu: {
        slotId: "lead_zhou_lu",
        packId: "pack-cast",
        baseUrl: "https://example.test/cast.png",
        moodUrls: {},
        lockedAt: "2026-07-12T00:00:00.000Z",
      },
    };
    await session.startNew(cast);
    expect(session.getState().characterBindings).toEqual(cast);
    expect(loadSave(AUTOSAVE_SLOT)?.characterBindings).toEqual(cast);
  });

  it("resume: requested manual wins; missing requested falls to autosave; then first manual; then new", async () => {
    // No saves → new game.
    await expect(session.resume()).resolves.toBe("ready");
    expect(session.getState().storyId).toBe("draft-ch01");
    expect(loadSave(AUTOSAVE_SLOT)).not.toBeNull();

    localStorage.clear();
    session = createStorySession({
      initialUnlocks: EMPTY_UNLOCKS,
      loadRuntime: async () => runtime,
      preloadPresentation: async () => undefined,
    });

    // Autosave + two manuals; explicit requested slot-2 wins over autosave.
    writeSave(
      makeSave({
        slotId: AUTOSAVE_SLOT,
        presentation: {
          sceneId: "from-auto",
          text: "auto",
          choices: [],
          isEnded: false,
          meters: { dignity: 10, impulse: 90 },
        },
      }),
    );
    writeSave(
      makeSave({
        slotId: "slot-1",
        presentation: {
          sceneId: "from-slot-1",
          text: "s1",
          choices: [],
          isEnded: false,
          meters: { dignity: 20, impulse: 80 },
        },
      }),
    );
    writeSave(
      makeSave({
        slotId: "slot-2",
        presentation: {
          sceneId: "from-slot-2",
          text: "s2",
          choices: [],
          isEnded: false,
          meters: { dignity: 30, impulse: 70 },
        },
      }),
    );

    await expect(session.resume("slot-2")).resolves.toBe("ready");
    expect(session.getState().snapshot?.sceneId).toBe("from-slot-2");
    expect(session.getState().activeManualSlot).toBe("slot-2");

    // Missing requested slot → autosave.
    localStorage.clear();
    writeSave(
      makeSave({
        slotId: AUTOSAVE_SLOT,
        presentation: {
          sceneId: "autosave-only",
          text: "auto",
          choices: [],
          isEnded: false,
          meters: { dignity: 11, impulse: 22 },
        },
      }),
    );
    session = createStorySession({
      initialUnlocks: EMPTY_UNLOCKS,
      loadRuntime: async () => runtime,
      preloadPresentation: async () => undefined,
    });
    await expect(session.resume("slot-9")).resolves.toBe("ready");
    expect(session.getState().snapshot?.sceneId).toBe("autosave-only");

    // Absent autosave → first existing manual (slot-1 before slot-3).
    localStorage.clear();
    writeSave(
      makeSave({
        slotId: "slot-3",
        presentation: {
          sceneId: "manual-3",
          text: "m3",
          choices: [],
          isEnded: false,
          meters: { dignity: 1, impulse: 2 },
        },
      }),
    );
    writeSave(
      makeSave({
        slotId: "slot-1",
        presentation: {
          sceneId: "manual-1",
          text: "m1",
          choices: [],
          isEnded: false,
          meters: { dignity: 3, impulse: 4 },
        },
      }),
    );
    session = createStorySession({
      initialUnlocks: EMPTY_UNLOCKS,
      loadRuntime: async () => runtime,
      preloadPresentation: async () => undefined,
    });
    await expect(session.resume()).resolves.toBe("ready");
    expect(session.getState().snapshot?.sceneId).toBe("manual-1");
    expect(session.getState().activeManualSlot).toBe("slot-1");
  });

  it("resume applies saved bindings via refreshCharacterBindings, including legacy portrait fallback", async () => {
    const savedBindings: StoryCharacterBindings = {
      lead_suming: {
        slotId: "lead_suming",
        packId: "saved-pack",
        baseUrl: "https://example.test/saved.png",
        moodUrls: { happy: "https://example.test/saved-happy.png" },
        lockedAt: "2026-07-01T00:00:00.000Z",
      },
    };
    const refreshed: StoryCharacterBindings = {
      lead_suming: {
        ...savedBindings.lead_suming!,
        baseUrl: "https://example.test/refreshed.png",
        moodUrls: { happy: "https://example.test/refreshed-happy.png" },
      },
    };
    const refreshSpy = vi.fn(async (bindings: StoryCharacterBindings) => {
      expect(bindings).toEqual(savedBindings);
      return refreshed;
    });

    writeSave(makeSave({ characterBindings: savedBindings }));
    session = createStorySession({
      initialUnlocks: EMPTY_UNLOCKS,
      loadRuntime: async () => runtime,
      preloadPresentation: async () => undefined,
      refreshCharacterBindings: refreshSpy,
    });
    await expect(session.resume()).resolves.toBe("ready");
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(session.getState().characterBindings).toEqual(refreshed);

    // Legacy path: no characterBindings → portrait pack fallback, then refresh.
    localStorage.clear();
    writeSave(makeSave({ characterBindings: undefined }));
    const legacyPack: PortraitPackState = {
      byStem: {},
      byLead: {
        suming: "https://example.test/legacy-suming.png",
      },
    };
    const legacyRefresh = vi.fn(async (bindings: StoryCharacterBindings) => bindings);
    session = createStorySession({
      initialUnlocks: EMPTY_UNLOCKS,
      loadRuntime: async () => runtime,
      preloadPresentation: async () => undefined,
      refreshCharacterBindings: legacyRefresh,
    });
    await expect(session.resume(undefined, legacyPack)).resolves.toBe("ready");
    expect(legacyRefresh).toHaveBeenCalledTimes(1);
    const passed = legacyRefresh.mock.calls[0]![0] as StoryCharacterBindings;
    // Production legacyPortraitBindings maps byLead → lead_* slots.
    expect(passed.lead_suming?.baseUrl).toBe("https://example.test/legacy-suming.png");
    expect(passed.lead_suming?.packId).toBe("legacy-local-suming");
    expect(session.getState().characterBindings).toEqual(passed);
  });

  it("resume blocks incompatible retired saves with existing message", async () => {
    writeSave(makeSave({ storyId: "ch01", version: 1, label: "旧 Demo" }));
    const result = await session.resume();
    expect(result).toBe("blocked");
    const message = session.getState().continueBlockedMessage;
    expect(message).toMatch(/退休|不兼容/);
    expect(evaluateSaveCompatibility(loadSave(AUTOSAVE_SLOT)).ok).toBe(false);
    // No partial publish of a playable runner.
    expect(session.getState().runner).toBeNull();
  });

  it("startGuestShell mounts inert runner without writing a save", async () => {
    await session.startGuestShell();
    expect(session.getState().runner).not.toBeNull();
    expect(session.getState().snapshot).not.toBeNull();
    expect(session.getState().revision).toBe(1);
    expect(loadSave(AUTOSAVE_SLOT)).toBeNull();
    for (const slot of MANUAL_SLOTS) {
      expect(loadSave(slot)).toBeNull();
    }
  });

  it("closeGuestShell nulls runner only — snapshot/revision/saves unchanged", async () => {
    await session.startGuestShell();
    const before = session.getState();
    expect(before.runner).not.toBeNull();
    expect(before.snapshot).not.toBeNull();

    session.closeGuestShell();
    const after = session.getState();
    expect(after.runner).toBeNull();
    expect(after.snapshot).toBe(before.snapshot);
    expect(after.storyId).toBe(before.storyId);
    expect(after.unlocks).toEqual(before.unlocks);
    expect(after.characterBindings).toEqual(before.characterBindings);
    expect(after.activeManualSlot).toBe(before.activeManualSlot);
    expect(after.revision).toBe(before.revision);
    expect(after.continueBlockedMessage).toBe(before.continueBlockedMessage);
    expect(loadSave(AUTOSAVE_SLOT)).toBeNull();

    // Idempotent when already closed.
    session.closeGuestShell();
    expect(session.getState().revision).toBe(before.revision);
    expect(session.getState().runner).toBeNull();
  });

  it("canAdvanceToNextChapter is synchronous next-chapter vs terminal classification", async () => {
    // Next-chapter story.
    await session.startNew();
    expect(session.canAdvanceToNextChapter()).toBe(true);

    // Terminal story (ai_final / no next chapter).
    const terminalRuntime = makeRuntime({ nextChapterId: null });
    session = createStorySession({
      initialUnlocks: EMPTY_UNLOCKS,
      loadRuntime: async () => terminalRuntime,
      preloadPresentation: async () => undefined,
    });
    await session.startNew();
    expect(session.canAdvanceToNextChapter()).toBe(false);
    expect(await session.advanceToNextChapter()).toBe(false);
    expect(session.getState().storyId).toBe("draft-ch01");
  });

  it("failed preload leaves previous state and previous active runtime for choose/jump", async () => {
    const runtimeA = makeRuntime({
      runtimeTag: "A",
      unlocksForScene: { images: ["bg-from-A"], audio: [] },
    });
    const runtimeB = makeRuntime({
      runtimeTag: "B",
      unlocksForScene: { images: ["bg-from-B"], audio: [] },
    });
    let activeLoader: StoryRuntime = runtimeA;
    let failPreload = false;

    session = createStorySession({
      initialUnlocks: EMPTY_UNLOCKS,
      loadRuntime: async () => activeLoader,
      preloadPresentation: async () => {
        if (failPreload) {
          throw new Error("preload failed");
        }
      },
    });

    await session.startNew();
    const seeded = session.getState();
    expect(seeded.runner).not.toBeNull();

    // Fail a chapter transition that would have activated runtime B.
    activeLoader = runtimeB;
    failPreload = true;
    await expect(session.loadChapter("draft-ch02" as StoryId)).rejects.toThrow(/preload failed/);

    const after = session.getState();
    expect(after.storyId).toBe(seeded.storyId);
    expect(after.snapshot?.sceneId).toBe(seeded.snapshot?.sceneId);
    expect(after.revision).toBe(seeded.revision);
    expect(after.runner).toBe(seeded.runner);

    // Authored choose still uses previous runtime A's unlock/save adapter.
    const chosen = session.choose(0);
    expect(chosen?.sceneId).toBe("chosen-0");
    expect(session.getState().unlocks.images).toContain("runtime-A");
    expect(session.getState().unlocks.images).not.toContain("runtime-B");
    const autosave = loadSave(AUTOSAVE_SLOT);
    expect(autosave?.unlocks.images).toContain("runtime-A");
    expect(autosave?.presentation?.sceneId).toBe("chosen-0");

    // Jump also stays on previous runtime.
    session.jump("rejoin_after_fail");
    expect(session.getState().unlocks.images).toContain("runtime-A");
    expect(loadSave(AUTOSAVE_SLOT)?.presentation?.sceneId).toBe("rejoin_after_fail");
  });

  it("chapter transition exports inherited variables and autosaves chapter 2", async () => {
    runtime = makeRuntime({
      inheritVariableNames: [
        "dignity",
        "clue_subsidy_sms",
        "breakup_delivery",
        "memory_posture",
        "frontdesk_response",
      ],
      nextChapterId: "draft-ch02",
    });
    session = createStorySession({
      initialUnlocks: EMPTY_UNLOCKS,
      loadRuntime: async () => runtime,
      preloadPresentation: async () => undefined,
    });
    await session.startNew();
    session.getState().runner?.applyVariables({
      dignity: 61,
      clue_subsidy_sms: true,
      breakup_delivery: "hard",
      memory_posture: "shame",
      frontdesk_response: "calculate",
    });

    expect(session.canAdvanceToNextChapter()).toBe(true);
    const advanced = await session.advanceToNextChapter();
    expect(advanced).toBe(true);
    expect(session.getState().storyId).toBe("draft-ch02");
    expect(session.getState().snapshot?.sceneId).toBe("dch02_s001");
    expect(session.getState().runner?.getVariable("dignity")).toBe(61);
    expect(session.getState().runner?.getVariable("clue_subsidy_sms")).toBe(true);
    expect(session.getState().runner?.getVariable("breakup_delivery")).toBe("hard");
    expect(session.getState().runner?.getVariable("memory_posture")).toBe("shame");
    expect(session.getState().runner?.getVariable("frontdesk_response")).toBe("calculate");

    const autosave = loadSave(AUTOSAVE_SLOT);
    expect(autosave?.storyId).toBe("draft-ch02");
    expect(autosave?.inheritedVariables).toEqual({
      dignity: 61,
      clue_subsidy_sms: true,
      breakup_delivery: "hard",
      memory_posture: "shame",
      frontdesk_response: "calculate",
    });
  });

  it("choose, jump, and reset preserve unlocks/snapshots and autosave timing", async () => {
    await session.startNew();
    const afterNew = loadSave(AUTOSAVE_SLOT);
    expect(afterNew).not.toBeNull();

    const chosen = session.choose(0);
    expect(chosen?.sceneId).toBe("chosen-0");
    expect(session.getState().snapshot?.sceneId).toBe("chosen-0");
    const afterChoose = loadSave(AUTOSAVE_SLOT);
    expect(afterChoose?.presentation?.sceneId).toBe("chosen-0");

    const jumped = session.jump("rejoin_knot");
    expect(jumped?.sceneId).toBe("rejoin_knot");
    expect(loadSave(AUTOSAVE_SLOT)?.presentation?.sceneId).toBe("rejoin_knot");

    const revisionBeforeReset = session.getState().revision;
    await session.reset();
    expect(session.getState().revision).toBe(revisionBeforeReset + 1);
    expect(session.getState().snapshot?.sceneId).toBe("dch01_s001");
    expect(loadSave(AUTOSAVE_SLOT)?.storyId).toBe("draft-ch01");
  });

  it("manual save writes selected manual slot and autosave with latest bindings", async () => {
    await session.startNew();
    const latest: StoryCharacterBindings = {
      lead_zhou_lu: {
        slotId: "lead_zhou_lu",
        packId: "pack-2",
        baseUrl: "https://example.test/zhou.png",
        moodUrls: {},
        lockedAt: "2026-07-12T00:00:00.000Z",
      },
    };
    session.updateCharacterBindings(latest);
    expect(session.save("slot-3")).toBe(true);
    expect(session.getState().activeManualSlot).toBe("slot-3");

    const manual = loadSave("slot-3");
    const auto = loadSave(AUTOSAVE_SLOT);
    expect(manual?.characterBindings).toEqual(latest);
    expect(auto?.characterBindings).toEqual(latest);
    expect(manual?.storyId).toBe("draft-ch01");
    expect(auto?.storyId).toBe("draft-ch01");
  });

  it("subscribe publishes only after ready presentation for startNew", async () => {
    const publications: string[] = [];
    let resolvePreload!: () => void;
    const preloadGate = new Promise<void>((resolve) => {
      resolvePreload = resolve;
    });

    session = createStorySession({
      initialUnlocks: EMPTY_UNLOCKS,
      loadRuntime: async () => runtime,
      preloadPresentation: async () => preloadGate,
    });
    session.subscribe((state) => {
      if (state.runner) {
        publications.push(state.snapshot?.sceneId ?? "none");
      }
    });

    const pending = session.startNew();
    expect(publications).toEqual([]);
    resolvePreload();
    await pending;
    expect(publications).toEqual(["dch01_s001"]);
  });
});
