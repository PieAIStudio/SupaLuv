import type { CharacterKind, CharacterMoodKey, CharacterPackStatus } from "@supaluv/shared";

export interface BrowserCharacterAsset {
  readonly id: string;
  readonly url: string;
  readonly mimeType: string;
  readonly moodKey?: CharacterMoodKey;
}

export interface BrowserCharacterPack {
  readonly id: string;
  readonly slotId: string;
  readonly kind: CharacterKind;
  readonly status: CharacterPackStatus;
  readonly baseAsset?: BrowserCharacterAsset;
  readonly moodAssets: Readonly<Partial<Record<CharacterMoodKey, BrowserCharacterAsset>>>;
}

/** Immutable URL snapshot stored with a story run. Later pack edits cannot rewrite an existing run. */
export interface LockedCharacterBinding {
  readonly slotId: string;
  readonly packId: string;
  readonly baseUrl: string;
  readonly moodUrls: Readonly<Partial<Record<CharacterMoodKey, string>>>;
  readonly lockedAt: string;
}

export type StoryCharacterBindings = Readonly<Record<string, LockedCharacterBinding>>;
