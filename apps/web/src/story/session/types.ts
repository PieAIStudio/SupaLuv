import type { StoryCharacterBindings } from "../../characters/characterPackTypes";
import type { GalleryUnlocks, ManualSlotId } from "../../persistence/gameSave";
import type { PortraitPackState } from "../../persistence/portraitPack";
import type { InkStoryRunner, InkStorySnapshot } from "../inkStoryRunner";
import type { StoryId } from "../storyMapAdapter";

export type StorySessionState = Readonly<{
  storyId: StoryId;
  runner: InkStoryRunner | null;
  snapshot: InkStorySnapshot | null;
  unlocks: GalleryUnlocks;
  characterBindings: StoryCharacterBindings;
  activeManualSlot: ManualSlotId;
  revision: number;
  continueBlockedMessage: string | null;
}>;

/**
 * Deep story-session module: owns Ink runner lifecycle, save/restore,
 * chapter transition, and gallery unlocks that participate in story state.
 *
 * Non-responsibilities (stay in App): navigation, atomic overlay lock,
 * audio/analytics/achievements/toasts, settings, co-play network, rendering.
 */
export interface StorySession {
  getState(): StorySessionState;
  subscribe(listener: (state: StorySessionState) => void): () => void;
  startNew(bindings?: StoryCharacterBindings): Promise<void>;
  startGuestShell(): Promise<void>;
  /**
   * Guest leave only: drop the inert runner so play cannot remount, without
   * clearing snapshot/bindings/unlocks, bumping revision, or writing a save.
   */
  closeGuestShell(): void;
  resume(slotId?: string, legacyPortraitPack?: PortraitPackState): Promise<"ready" | "blocked">;
  loadChapter(storyId: StoryId, inherited?: Readonly<Record<string, unknown>>): Promise<void>;
  /**
   * Synchronous checkpoint classification against the active session runtime.
   * True when the current story can advance to a next authored chapter.
   */
  canAdvanceToNextChapter(): boolean;
  advanceToNextChapter(): Promise<boolean>;
  choose(index: number): InkStorySnapshot | null;
  jump(path: string): InkStorySnapshot | null;
  reset(): Promise<void>;
  save(slotId?: ManualSlotId): boolean;
  addUnlocks(partial: Partial<GalleryUnlocks>): GalleryUnlocks;
  updateCharacterBindings(bindings: StoryCharacterBindings): void;
  clearContinueBlocked(): void;
  /**
   * Hot-swap compiled Ink language for the active runner (ADR-0008).
   * Does not rewrite save slots; ink state topology is shared across locales.
   */
  reloadForContentLocale(locale: string): Promise<void>;
}
