export type CharacterPackRecord = {
  readonly id: string;
  readonly ownerId: string;
  readonly clientPackId: string;
  readonly slotId: string;
  readonly status: "draft" | "base_ready" | "active" | "failed" | "deleting" | "deleted";
  readonly brief: Readonly<Record<string, unknown>>;
  readonly provider?: string;
  readonly model?: string;
};

export type ReferenceAssetRecord = {
  readonly id: string;
  readonly ownerId: string;
  readonly packId: string;
  readonly referenceIndex: number;
  readonly storageBucket: string;
  readonly storagePath: string;
  readonly mimeType: string;
  readonly expiresAt: string;
};

export type StoredObjectRecord = {
  readonly assetId: string;
  readonly ownerId: string;
  readonly storageBucket: string;
  readonly storagePath: string;
};

export type GeneratedAssetRecord = {
  readonly id: string;
  readonly ownerId: string;
  readonly packId: string;
  readonly assetKind: "base" | "mood";
  readonly moodKey?: string;
  readonly actionKey: string;
  readonly storageBucket: string;
  readonly storagePath: string;
  readonly mimeType: string;
  readonly moderation: Readonly<Record<string, unknown>>;
  readonly provider: string;
  readonly model: string;
};

export type GenerationActionKind =
  | "character_base"
  | "character_regeneration"
  | "character_mood_pack"
  | "character_mood";

export type GenerationClaim =
  | { readonly state: "claimed"; readonly claimToken: string }
  | { readonly state: "busy" }
  | { readonly state: "completed"; readonly asset: GeneratedAssetRecord };

export type StoryRunRecord = {
  readonly id: string;
  readonly ownerId: string;
  readonly clientRunId: string;
  readonly storyId: string;
  readonly status: "active" | "completed" | "abandoned";
  readonly characterBindings: Readonly<Record<string, unknown>>;
};

export type EndingSessionRecord = {
  readonly id: string;
  readonly ownerId: string;
  readonly storyRunId: string;
  readonly clientSessionId: string;
  readonly entryId: string;
  readonly status: "outline_pending" | "active" | "paused" | "completed" | "failed" | "deleted";
  readonly currentVersion: number;
  readonly currentSequence: number;
  readonly maxSegments: number;
  readonly continuity: Readonly<Record<string, unknown>>;
  readonly outline?: Readonly<Record<string, unknown>>;
  readonly outcomeAnchor?: string;
};

export type AdvanceEndingCheckpointInput = {
  readonly ownerId: string;
  readonly sessionId: string;
  readonly expectedVersion: number;
  readonly actionKey: string;
  readonly playerAction: Readonly<Record<string, unknown>>;
  readonly segment: Readonly<Record<string, unknown>>;
  readonly choices: readonly Readonly<Record<string, unknown>>[];
  readonly continuity: Readonly<Record<string, unknown>>;
  readonly terminal: boolean;
};

export type EndingCheckpointRecord = {
  readonly id: string;
  readonly ownerId: string;
  readonly sessionId: string;
  readonly sequence: number;
  readonly sessionVersion: number;
  readonly actionKey: string;
  readonly terminal: boolean;
  readonly idempotent: boolean;
  readonly playerAction: Readonly<Record<string, unknown>>;
  readonly segment: Readonly<Record<string, unknown>>;
  readonly choices: readonly Readonly<Record<string, unknown>>[];
  readonly continuity: Readonly<Record<string, unknown>>;
};

export type SpendReceiptInput = {
  readonly ownerId: string;
  readonly walletReservationId: string;
  readonly actionKind:
    | "character_base"
    | "character_regeneration"
    | "character_mood_pack"
    | "character_mood"
    | "ai_side_choice"
    | "ai_ending_segment"
    | "ai_ending_still";
  readonly scopeType: "character_pack" | "story_run" | "ai_ending_session";
  readonly scopeId?: string;
  readonly amountPowerUnits: number;
  readonly metadata: Readonly<Record<string, unknown>>;
};

export type SpendReceiptRecord = SpendReceiptInput & {
  readonly id: string;
  readonly idempotent: boolean;
};

export type SettleCharacterGenerationInput = {
  readonly asset: GeneratedAssetRecord;
  readonly claimToken: string;
  readonly walletReservationId: string;
  readonly actionKind: GenerationActionKind;
  readonly amountPowerUnits: number;
  readonly metadata: Readonly<Record<string, unknown>>;
};

export type SettleEndingCheckpointInput = AdvanceEndingCheckpointInput & {
  readonly walletReservationId: string;
  readonly amountPowerUnits: number;
  readonly metadata: Readonly<Record<string, unknown>>;
};
