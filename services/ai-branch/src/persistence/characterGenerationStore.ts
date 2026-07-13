import type {
  CharacterPackRecord,
  GeneratedAssetRecord,
  GenerationActionKind,
  GenerationClaim,
  ReferenceAssetRecord,
  SettleCharacterGenerationInput,
  StoredObjectRecord,
} from "./types.js";

/**
 * Character commercial persistence: packs, references, generated assets,
 * generation claims, and atomic charge+delivery settlement.
 *
 * Receipt writes happen only inside settleCharacterGeneration — callers must
 * not write spend receipts separately for character actions.
 */
export interface CharacterGenerationStore {
  saveCharacterPack(record: CharacterPackRecord): Promise<CharacterPackRecord>;
  getCharacterPack(ownerId: string, packId: string): Promise<CharacterPackRecord | null>;
  listCharacterPacks(ownerId: string, slotId?: string): Promise<readonly CharacterPackRecord[]>;
  saveReferenceAsset(record: ReferenceAssetRecord): Promise<ReferenceAssetRecord>;
  getReferenceAsset(ownerId: string, assetId: string): Promise<ReferenceAssetRecord | null>;
  listReferenceAssets(ownerId: string, packId: string): Promise<readonly ReferenceAssetRecord[]>;
  deleteReferenceAsset(ownerId: string, assetId: string): Promise<StoredObjectRecord | null>;
  expireReferenceAssets(beforeIso: string, limit: number): Promise<readonly StoredObjectRecord[]>;
  saveGeneratedAsset(record: GeneratedAssetRecord): Promise<GeneratedAssetRecord>;
  getGeneratedAssetByActionKey(
    ownerId: string,
    actionKey: string,
  ): Promise<GeneratedAssetRecord | null>;
  listGeneratedAssets(ownerId: string, packId: string): Promise<readonly GeneratedAssetRecord[]>;
  deleteCharacterPack(ownerId: string, packId: string): Promise<readonly StoredObjectRecord[]>;
  claimGenerationAction(input: {
    readonly ownerId: string;
    readonly packId: string;
    readonly actionKey: string;
    readonly actionKind: GenerationActionKind;
  }): Promise<GenerationClaim>;
  completeGenerationAction(input: {
    readonly ownerId: string;
    readonly actionKey: string;
    readonly claimToken: string;
    readonly assetId: string;
  }): Promise<void>;
  settleCharacterGeneration(input: SettleCharacterGenerationInput): Promise<GeneratedAssetRecord>;
  failGenerationAction(input: {
    readonly ownerId: string;
    readonly actionKey: string;
    readonly claimToken: string;
  }): Promise<void>;
}
