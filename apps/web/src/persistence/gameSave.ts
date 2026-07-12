import { isProductionStoryId, isRetiredStoryId } from "@supaluv/content";
import type { StoryId } from "../story/storyMapAdapter";
import type { ComedyMeters, InkStoryChoice, InkStorySnapshot } from "../story/inkStoryRunner";
import type { StoryCharacterBindings } from "../characters/characterPackTypes";

export const SAVE_VERSION = 2 as const;
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
  readonly version: typeof SAVE_VERSION | 1;
  readonly slotId: string;
  readonly storyId: string;
  readonly packageId?: string;
  readonly inkStateJson: string;
  readonly label: string;
  readonly savedAt: string;
  readonly unlocks: GalleryUnlocks;
  readonly chapterHint?: string;
  /** Optional for legacy saves written before presentation snapshots. */
  readonly presentation?: SavePresentation;
  readonly characterBindings?: StoryCharacterBindings;
  /** Variables carried across chapters within a package. */
  readonly inheritedVariables?: Readonly<Record<string, unknown>>;
}

export type SaveCompatibility =
  | { readonly ok: true; readonly storyId: StoryId; readonly save: GameSavePayload }
  | {
      readonly ok: false;
      readonly reason: "missing" | "corrupt" | "retired" | "unknown_story";
      readonly message: string;
      readonly save?: GameSavePayload;
    };

export const EMPTY_UNLOCKS: GalleryUnlocks = {
  images: [],
  videos: [],
  audio: [],
};

export const DRAFT_CLEAR_REWARDS: GalleryUnlocks = {
  images: ["bg-product-page", "bg-office-night", "bg-rental-room", "bg-lobby-white"],
  videos: [],
  audio: ["title-theme", "soft-piano", "chapter-end", "lonely-pad", "night-ambient"],
};

/** @deprecated Use DRAFT_CLEAR_REWARDS */
export const CH01_CLEAR_REWARDS = DRAFT_CLEAR_REWARDS;

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
    if (
      (parsed.version !== SAVE_VERSION && parsed.version !== 1) ||
      typeof parsed.inkStateJson !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function evaluateSaveCompatibility(save: GameSavePayload | null): SaveCompatibility {
  if (!save) {
    return {
      ok: false,
      reason: "missing",
      message: "没有可读取的存档。",
    };
  }
  if (isRetiredStoryId(save.storyId)) {
    return {
      ok: false,
      reason: "retired",
      save,
      message:
        "此存档属于已退休的旧 Demo 章节（ch01 · 不会嫌弃你），与当前默认故事不兼容，无法继续。请开始新游戏。",
    };
  }
  if (
    !isProductionStoryId(save.storyId) &&
    save.storyId !== "prototype-act1" &&
    save.storyId !== "chapter-01-trial"
  ) {
    return {
      ok: false,
      reason: "unknown_story",
      save,
      message: `此存档的故事 ID「${save.storyId}」当前不可用，无法恢复。`,
    };
  }
  return {
    ok: true,
    storyId: save.storyId as StoryId,
    save,
  };
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
