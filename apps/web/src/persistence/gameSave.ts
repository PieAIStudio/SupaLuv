import type { StoryId } from "../story/storyMapAdapter";
import type { ComedyMeters, InkStoryChoice, InkStorySnapshot } from "../story/inkStoryRunner";
import type { StoryCharacterBindings } from "../characters/characterPackTypes";

export const SAVE_VERSION = 1 as const;
export const AUTOSAVE_SLOT = "autosave";
export const MANUAL_SLOTS = ["slot-1", "slot-2", "slot-3"] as const;
export type ManualSlotId = (typeof MANUAL_SLOTS)[number];

const STORAGE_PREFIX = "supaluv.save.v1.";

export interface GalleryUnlocks {
  readonly images: readonly string[];
  readonly videos: readonly string[];
  readonly audio: readonly string[];
}

/**
 * What the player last saw. Required because Ink state at a choice boundary
 * has already consumed dialogue lines — LoadJson alone yields empty text/scene.
 */
export interface SavePresentation {
  readonly sceneId: string | null;
  readonly text: string;
  readonly choices: readonly InkStoryChoice[];
  readonly isEnded: boolean;
  readonly meters: ComedyMeters;
}

export interface GameSavePayload {
  readonly version: typeof SAVE_VERSION;
  readonly slotId: string;
  readonly storyId: StoryId;
  readonly inkStateJson: string;
  readonly label: string;
  readonly savedAt: string;
  readonly unlocks: GalleryUnlocks;
  readonly chapterHint?: string;
  /** Optional for legacy saves written before presentation snapshots. */
  readonly presentation?: SavePresentation;
  readonly characterBindings?: StoryCharacterBindings;
}

export const EMPTY_UNLOCKS: GalleryUnlocks = {
  images: [],
  videos: [],
  audio: [],
};

export const CH01_CLEAR_REWARDS: GalleryUnlocks = {
  images: ["bg-product-page", "bg-office-night"],
  videos: [],
  audio: ["title-theme", "soft-piano", "chapter-end", "lonely-pad", "night-ambient"],
};

function slotKey(slotId: string): string {
  return `${STORAGE_PREFIX}${slotId}`;
}

export function presentationFromSnapshot(snapshot: InkStorySnapshot): SavePresentation {
  return {
    sceneId: snapshot.sceneId,
    text: snapshot.text,
    choices: snapshot.choices,
    isEnded: snapshot.isEnded,
    meters: snapshot.meters,
  };
}

/**
 * Prefer live Ink choices/meters; fill blank scene/text from saved presentation.
 */
export function restoreSnapshotFromSave(
  inkSnapshot: InkStorySnapshot,
  presentation: SavePresentation | undefined,
): InkStorySnapshot {
  if (!presentation) {
    return inkSnapshot;
  }
  const inkHasText = inkSnapshot.text.trim().length > 0;
  const inkHasScene = Boolean(inkSnapshot.sceneId);
  if (inkHasText && inkHasScene) {
    return inkSnapshot;
  }
  return {
    sceneId: inkSnapshot.sceneId ?? presentation.sceneId,
    text: inkHasText ? inkSnapshot.text : presentation.text,
    // Live Ink choice indices are authoritative when present.
    choices: inkSnapshot.choices.length > 0 ? inkSnapshot.choices : presentation.choices,
    isEnded: inkSnapshot.isEnded || presentation.isEnded,
    meters: inkSnapshot.meters,
  };
}

export function loadSave(slotId: string): GameSavePayload | null {
  try {
    const raw = localStorage.getItem(slotKey(slotId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as GameSavePayload;
    if (parsed.version !== SAVE_VERSION || typeof parsed.inkStateJson !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeSave(payload: GameSavePayload): void {
  localStorage.setItem(slotKey(payload.slotId), JSON.stringify(payload));
}

export function listSaveSlots(): readonly GameSavePayload[] {
  const slots: GameSavePayload[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key?.startsWith(STORAGE_PREFIX)) {
      continue;
    }
    const slotId = key.slice(STORAGE_PREFIX.length);
    const save = loadSave(slotId);
    if (save) {
      slots.push(save);
    }
  }
  return slots.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function findLatestSave(): GameSavePayload | null {
  return listSaveSlots()[0] ?? null;
}

export function collectAllUnlocks(): GalleryUnlocks {
  return listSaveSlots().reduce<GalleryUnlocks>(
    (acc, save) => mergeUnlocks(acc, save.unlocks ?? EMPTY_UNLOCKS),
    EMPTY_UNLOCKS,
  );
}

export function mergeUnlocks(base: GalleryUnlocks, next: Partial<GalleryUnlocks>): GalleryUnlocks {
  const uniq = (items: readonly string[]) => [...new Set(items)];
  return {
    images: uniq([...base.images, ...(next.images ?? [])]),
    videos: uniq([...base.videos, ...(next.videos ?? [])]),
    audio: uniq([...base.audio, ...(next.audio ?? [])]),
  };
}
