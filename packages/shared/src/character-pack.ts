export const INITIAL_CHARACTER_MOOD_KEYS = [
  "neutral",
  "happy",
  "awkward",
  "angry",
  "surprised",
  "sad",
] as const;

export type InitialCharacterMoodKey = (typeof INITIAL_CHARACTER_MOOD_KEYS)[number];
export type CharacterMoodKey = InitialCharacterMoodKey | `custom:${string}`;
export type CharacterKind = "human" | "robot";
export type CharacterInputMode = "image_references" | "text_brief";

export type CharacterLockPoint =
  | { readonly kind: "before_new_game" }
  | {
      readonly kind: "story_knot";
      readonly storyId: string;
      readonly knotId: string;
    }
  | {
      readonly kind: "deferred_story_knot";
      readonly reason: string;
    };

export interface CharacterSlotDefinition {
  readonly id: string;
  readonly officialCharacterId: string;
  readonly displayName: string;
  readonly displayRole: string;
  readonly kind: CharacterKind;
  readonly allowedInputModes: readonly CharacterInputMode[];
  readonly requiredMoodKeys: readonly InitialCharacterMoodKey[];
  readonly lockPoint: CharacterLockPoint;
}

export type CharacterPackStatus =
  | "draft"
  | "base_ready"
  | "active"
  | "failed"
  | "deleting"
  | "deleted";

export type CharacterAssetKind = "reference" | "base" | "mood";

export interface CharacterAsset {
  readonly id: string;
  readonly kind: CharacterAssetKind;
  readonly mimeType: string;
  readonly url: string;
  readonly referenceIndex?: number;
  readonly moodKey?: CharacterMoodKey;
  readonly expiresAt?: string;
}

export interface CharacterModerationSummary {
  readonly input: "adult" | "not_applicable";
  readonly output: "allowed";
}

export interface CharacterProvenance {
  readonly provider: string;
  readonly model: string;
  readonly requestId?: string;
}

export interface CharacterPack {
  readonly id: string;
  readonly ownerId: string;
  readonly slotId: string;
  readonly status: CharacterPackStatus;
  readonly brief: string;
  readonly references: readonly CharacterAsset[];
  readonly baseAsset?: CharacterAsset;
  readonly moodAssets: Readonly<Partial<Record<CharacterMoodKey, CharacterAsset>>>;
  readonly moderation?: CharacterModerationSummary;
  readonly provenance?: CharacterProvenance;
  readonly createdAt: string;
  readonly lastUsedAt: string;
  readonly deletedAt?: string;
}
