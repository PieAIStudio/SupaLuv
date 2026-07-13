/**
 * StorySession factory — pure domain session over Ink + local saves.
 *
 * Observable state is published only after the next presentation is ready
 * (or immediately for sync choose/jump/save). Failed preloads leave prior
 * state untouched so App can retry without a partial screen swap.
 *
 * Runtime activation is atomic with the ready runner/snapshot commit: a failed
 * start/resume/chapter transition never swaps the previous active runtime.
 */

import type { StoryCharacterBindings } from "../../characters/characterPackTypes";
import {
  AUTOSAVE_SLOT,
  collectAllUnlocks,
  EMPTY_UNLOCKS,
  evaluateSaveCompatibility,
  loadSave,
  MANUAL_SLOTS,
  mergeUnlocks,
  restoreSnapshotFromSave,
  type GalleryUnlocks,
  type GameSavePayload,
  type ManualSlotId,
} from "../../persistence/gameSave";
import { legacyPortraitBindings, type PortraitPackState } from "../../persistence/portraitPack";
import { DEFAULT_STORY_ID as CONTENT_DEFAULT_STORY_ID } from "@supaluv/content";
import type { InkStoryRunner, InkStorySnapshot } from "../inkStoryRunner";
import type { StoryId } from "../storyMapAdapter";
import { loadStoryRuntime, type StoryRuntime } from "./storyRuntime";
import type { StorySession, StorySessionState } from "./types";

const DEFAULT_STORY_ID: StoryId = CONTENT_DEFAULT_STORY_ID;

export type StorySessionDependencies = Readonly<{
  readonly defaultStoryId?: StoryId;
  readonly initialUnlocks?: GalleryUnlocks;
  /** Lazy runtime load (Ink runner + story map + unlocks + save writer). */
  readonly loadRuntime?: () => Promise<StoryRuntime>;
  /**
   * Wait until the next play presentation is ready (chunk + critical art).
   * Failure must reject so the session never publishes a half-loaded story.
   */
  readonly preloadPresentation?: (
    runtime: StoryRuntime,
    storyId: StoryId,
    sceneId: string | null,
  ) => Promise<void>;
  readonly loadSaveSlot?: (slotId: string) => GameSavePayload | null;
  readonly evaluateCompatibility?: typeof evaluateSaveCompatibility;
  readonly refreshCharacterBindings?: (
    bindings: StoryCharacterBindings,
  ) => Promise<StoryCharacterBindings>;
  /**
   * Fired when scene/manual unlock merge gains new gallery entries.
   * Presentation-only (toast/sfx); not part of the public StorySession API.
   */
  readonly onUnlocksGained?: (gained: number, unlocks: GalleryUnlocks) => void;
}>;

function unlockCount(unlocks: GalleryUnlocks): number {
  return unlocks.images.length + unlocks.videos.length + unlocks.audio.length;
}

function defaultPreload(
  _runtime: StoryRuntime,
  _storyId: StoryId,
  _sceneId: string | null,
): Promise<void> {
  return Promise.resolve();
}

function defaultRefresh(bindings: StoryCharacterBindings): Promise<StoryCharacterBindings> {
  return Promise.resolve(bindings);
}

export function createStorySession(deps: StorySessionDependencies = {}): StorySession {
  const defaultStoryId = deps.defaultStoryId ?? DEFAULT_STORY_ID;
  const loadRuntimeDep = deps.loadRuntime ?? loadStoryRuntime;
  const preloadPresentation = deps.preloadPresentation ?? defaultPreload;
  const loadSaveSlot = deps.loadSaveSlot ?? loadSave;
  const evaluateCompatibility = deps.evaluateCompatibility ?? evaluateSaveCompatibility;
  const refreshCharacterBindings = deps.refreshCharacterBindings ?? defaultRefresh;
  const onUnlocksGained = deps.onUnlocksGained;

  let state: StorySessionState = {
    storyId: defaultStoryId,
    runner: null,
    snapshot: null,
    unlocks: deps.initialUnlocks ?? collectAllUnlocks(),
    characterBindings: {},
    activeManualSlot: "slot-1",
    revision: 0,
    continueBlockedMessage: null,
  };
  let inheritedVariables: Record<string, unknown> = {};
  /**
   * Active runtime is committed only with a ready runner/snapshot.
   * Failed preload/refresh must leave the previous active runtime in place.
   */
  let activeRuntime: StoryRuntime | null = null;
  const listeners = new Set<(next: StorySessionState) => void>();

  function getState(): StorySessionState {
    return state;
  }

  function subscribe(listener: (next: StorySessionState) => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function publish(next: StorySessionState): void {
    state = next;
    for (const listener of listeners) {
      listener(state);
    }
  }

  function patch(partial: Partial<StorySessionState>): void {
    publish({ ...state, ...partial });
  }

  /** Load a candidate runtime without activating it. */
  async function loadCandidateRuntime(): Promise<StoryRuntime> {
    return loadRuntimeDep();
  }

  /** Commit runner/snapshot/runtime together after readiness gates pass. */
  function commitReady(runtime: StoryRuntime, next: StorySessionState): void {
    activeRuntime = runtime;
    publish(next);
  }

  function announceUnlocks(prev: GalleryUnlocks, next: GalleryUnlocks): GalleryUnlocks {
    if (onUnlocksGained) {
      const gained = unlockCount(next) - unlockCount(prev);
      if (gained > 0) {
        onUnlocksGained(gained, next);
      }
    }
    return next;
  }

  function applySceneUnlocks(
    base: GalleryUnlocks,
    runtime: StoryRuntime,
    storyId: StoryId,
    sceneId: string | null,
  ): GalleryUnlocks {
    return announceUnlocks(base, mergeUnlocks(base, runtime.unlocksFromScene(storyId, sceneId)));
  }

  function writeSaveSlots(
    runtime: StoryRuntime,
    runner: InkStoryRunner,
    storyId: StoryId,
    unlocks: GalleryUnlocks,
    slotId: string,
    presentationSnapshot: InkStorySnapshot,
    bindings: StoryCharacterBindings,
  ): void {
    runtime.writeStorySave({
      runner,
      storyId,
      unlocks,
      slotId,
      chapterHint: presentationSnapshot.sceneId ?? undefined,
      presentationSnapshot,
      characterBindings: bindings,
      inheritedVariables,
    });
  }

  async function startNew(bindings: StoryCharacterBindings = {}): Promise<void> {
    const runtime = await loadCandidateRuntime();
    const nextRunner = await runtime.createInkStoryRunnerForId(defaultStoryId);
    const nextSnapshot = nextRunner.getSnapshot();
    // Presentation readiness gate: reject before any publish on failure.
    await preloadPresentation(runtime, defaultStoryId, nextSnapshot.sceneId);
    const nextUnlocks = applySceneUnlocks(
      EMPTY_UNLOCKS,
      runtime,
      defaultStoryId,
      nextSnapshot.sceneId,
    );
    inheritedVariables = {};
    commitReady(runtime, {
      storyId: defaultStoryId,
      runner: nextRunner,
      snapshot: nextSnapshot,
      unlocks: nextUnlocks,
      characterBindings: bindings,
      activeManualSlot: state.activeManualSlot,
      revision: state.revision + 1,
      continueBlockedMessage: null,
    });
    writeSaveSlots(
      runtime,
      nextRunner,
      defaultStoryId,
      nextUnlocks,
      AUTOSAVE_SLOT,
      nextSnapshot,
      bindings,
    );
  }

  async function startGuestShell(): Promise<void> {
    const runtime = await loadCandidateRuntime();
    const nextRunner = await runtime.createInkStoryRunnerForId(defaultStoryId);
    const nextSnapshot = nextRunner.getSnapshot();
    await preloadPresentation(runtime, defaultStoryId, nextSnapshot.sceneId);
    // Guest shell is inert for authored saves — no writeStorySave, no unlock reset.
    commitReady(runtime, {
      ...state,
      storyId: defaultStoryId,
      runner: nextRunner,
      snapshot: nextSnapshot,
      revision: state.revision + 1,
    });
  }

  function closeGuestShell(): void {
    if (state.runner === null) {
      return;
    }
    // Exact pre-refactor guest leave: runner null only. Snapshot/revision/save untouched.
    publish({
      ...state,
      runner: null,
    });
  }

  async function resume(
    slotId?: string,
    legacyPortraitPack?: PortraitPackState,
  ): Promise<"ready" | "blocked"> {
    const save = loadSaveSlot(slotId ?? AUTOSAVE_SLOT) ?? loadSaveSlot(AUTOSAVE_SLOT);
    if (!save) {
      const anyManual = MANUAL_SLOTS.map((id) => loadSaveSlot(id)).find(Boolean);
      if (!anyManual) {
        await startNew();
        return "ready";
      }
      return resume(anyManual.slotId, legacyPortraitPack);
    }

    const compatibility = evaluateCompatibility(save);
    if (!compatibility.ok) {
      patch({ continueBlockedMessage: compatibility.message });
      return "blocked";
    }

    const runtime = await loadCandidateRuntime();
    const nextRunner = await runtime.createInkStoryRunnerForId(
      compatibility.storyId,
      save.inkStateJson,
    );
    const restored = restoreSnapshotFromSave(nextRunner.getSnapshot(), save.presentation);
    await preloadPresentation(runtime, compatibility.storyId, restored.sceneId);

    const pack = legacyPortraitPack ?? { byStem: {}, byLead: {} };
    const savedBindings = save.characterBindings ?? legacyPortraitBindings(pack, save.savedAt);
    const refreshedBindings = await refreshCharacterBindings(savedBindings);

    inheritedVariables = { ...(save.inheritedVariables ?? {}) };

    const nextActiveManualSlot = MANUAL_SLOTS.includes(save.slotId as ManualSlotId)
      ? (save.slotId as ManualSlotId)
      : state.activeManualSlot;

    // Silent unlock restore — no toast for save-loaded gallery state.
    commitReady(runtime, {
      storyId: compatibility.storyId,
      runner: nextRunner,
      snapshot: restored,
      unlocks: save.unlocks ?? EMPTY_UNLOCKS,
      characterBindings: refreshedBindings,
      activeManualSlot: nextActiveManualSlot,
      revision: state.revision + 1,
      continueBlockedMessage: null,
    });
    return "ready";
  }

  async function loadChapter(
    nextStoryId: StoryId,
    inherited?: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    const runtime = await loadCandidateRuntime();
    const nextInherited = inherited ?? inheritedVariables;
    const nextRunner = await runtime.createInkStoryRunnerForId(
      nextStoryId,
      undefined,
      nextInherited,
    );
    const nextSnapshot = nextRunner.getSnapshot();
    await preloadPresentation(runtime, nextStoryId, nextSnapshot.sceneId);
    const nextUnlocks = applySceneUnlocks(
      state.unlocks,
      runtime,
      nextStoryId,
      nextSnapshot.sceneId,
    );
    inheritedVariables = { ...nextInherited };
    const bindings = state.characterBindings;
    commitReady(runtime, {
      ...state,
      storyId: nextStoryId,
      runner: nextRunner,
      snapshot: nextSnapshot,
      unlocks: nextUnlocks,
      revision: state.revision + 1,
    });
    writeSaveSlots(
      runtime,
      nextRunner,
      nextStoryId,
      nextUnlocks,
      AUTOSAVE_SLOT,
      nextSnapshot,
      bindings,
    );
  }

  function canAdvanceToNextChapter(): boolean {
    if (!state.runner || !activeRuntime) {
      return false;
    }
    const checkpoint = activeRuntime.getChapterCheckpoint(state.storyId);
    return checkpoint.kind === "next_chapter" && Boolean(checkpoint.nextChapterId);
  }

  async function advanceToNextChapter(): Promise<boolean> {
    const { runner, storyId } = state;
    if (!runner || !activeRuntime) {
      return false;
    }
    const runtime = activeRuntime;
    const definition = runtime.getStoryDefinition(storyId);
    const checkpoint = definition.checkpoint;
    if (checkpoint.kind !== "next_chapter" || !checkpoint.nextChapterId) {
      return false;
    }
    const inherited = runner.exportVariables(definition.inheritVariableNames);
    inheritedVariables = inherited;
    await loadChapter(checkpoint.nextChapterId as StoryId, inherited);
    return true;
  }

  function choose(index: number): InkStorySnapshot | null {
    const { runner, snapshot, storyId, unlocks, characterBindings } = state;
    if (!runner || !snapshot || !activeRuntime) {
      return null;
    }
    const runtime = activeRuntime;
    const nextSnapshot = runner.choose(index);
    const nextUnlocks = applySceneUnlocks(unlocks, runtime, storyId, nextSnapshot.sceneId);
    patch({ snapshot: nextSnapshot, unlocks: nextUnlocks });
    writeSaveSlots(
      runtime,
      runner,
      storyId,
      nextUnlocks,
      AUTOSAVE_SLOT,
      nextSnapshot,
      characterBindings,
    );
    return nextSnapshot;
  }

  function jump(path: string): InkStorySnapshot | null {
    const { runner, storyId, unlocks, characterBindings } = state;
    if (!runner || !activeRuntime) {
      return null;
    }
    const runtime = activeRuntime;
    const nextSnapshot = runner.jumpTo(path);
    const nextUnlocks = applySceneUnlocks(unlocks, runtime, storyId, nextSnapshot.sceneId);
    patch({ snapshot: nextSnapshot, unlocks: nextUnlocks });
    writeSaveSlots(
      runtime,
      runner,
      storyId,
      nextUnlocks,
      AUTOSAVE_SLOT,
      nextSnapshot,
      characterBindings,
    );
    return nextSnapshot;
  }

  async function reset(): Promise<void> {
    await loadChapter(state.storyId);
  }

  function save(slotId?: ManualSlotId): boolean {
    const { runner, snapshot, storyId, unlocks, activeManualSlot } = state;
    if (!runner || !snapshot || !activeRuntime) {
      return false;
    }
    const runtime = activeRuntime;
    const target = slotId ?? activeManualSlot;
    if (target !== activeManualSlot) {
      patch({ activeManualSlot: target });
    }
    const latestBindings = state.characterBindings;
    writeSaveSlots(runtime, runner, storyId, unlocks, target, snapshot, latestBindings);
    writeSaveSlots(runtime, runner, storyId, unlocks, AUTOSAVE_SLOT, snapshot, latestBindings);
    return true;
  }

  function addUnlocks(partial: Partial<GalleryUnlocks>): GalleryUnlocks {
    const prev = state.unlocks;
    const next = announceUnlocks(prev, mergeUnlocks(prev, partial));
    const changed =
      next.images.length !== prev.images.length ||
      next.videos.length !== prev.videos.length ||
      next.audio.length !== prev.audio.length ||
      next.images.some((id, i) => id !== prev.images[i]) ||
      next.videos.some((id, i) => id !== prev.videos[i]) ||
      next.audio.some((id, i) => id !== prev.audio[i]);
    if (changed) {
      patch({ unlocks: next });
    }
    return state.unlocks;
  }

  function updateCharacterBindings(bindings: StoryCharacterBindings): void {
    patch({ characterBindings: bindings });
  }

  function clearContinueBlocked(): void {
    if (state.continueBlockedMessage !== null) {
      patch({ continueBlockedMessage: null });
    }
  }

  return {
    getState,
    subscribe,
    startNew,
    startGuestShell,
    closeGuestShell,
    resume,
    loadChapter,
    canAdvanceToNextChapter,
    advanceToNextChapter,
    choose,
    jump,
    reset,
    save,
    addUnlocks,
    updateCharacterBindings,
    clearContinueBlocked,
  };
}
