import { randomUUID } from "node:crypto";
import { INITIAL_CHARACTER_MOOD_KEYS, type CharacterKind } from "@supaluv/shared/character-pack";
import { makeActionIdempotencyKey } from "../actionIdentity.js";
import type { CharacterAssetBinaryStorage } from "./characterAssetService.js";
import { CHARACTER_ASSET_BUCKET } from "./characterAssetService.js";
import type { CharacterImageProvider } from "./characterImageProvider.js";
import type { CharacterSafety } from "./characterSafety.js";
import type { CharacterGenerationStore } from "../persistence/characterGenerationStore.js";
import type { GeneratedAssetRecord, GenerationActionKind } from "../persistence/types.js";

export interface CharacterGenerationWallet {
  reserve(input: {
    readonly ownerId: string;
    readonly batteries: number;
    readonly reason: string;
    readonly idempotencyKey: string;
  }): Promise<
    | {
        readonly ok: true;
        readonly reservationId: string;
        readonly amountPowerUnits: number;
        readonly skipped: boolean;
      }
    | { readonly ok: false; readonly code: string; readonly message: string }
  >;
  commit(reservationId: string, reason: string): Promise<void>;
  refund(reservationId: string, reason: string): Promise<void>;
}

export class CharacterGenerationBusyError extends Error {
  constructor() {
    super("Another character generation is already running for this pack");
    this.name = "CharacterGenerationBusyError";
  }
}

export class CharacterGenerationPaymentError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CharacterGenerationPaymentError";
  }
}

type GenerateBaseInput = {
  readonly ownerId: string;
  readonly packId: string;
  readonly clientActionId: string;
  readonly kind: CharacterKind;
  readonly prompt: string;
};

type GenerateMoodInput = GenerateBaseInput & {
  readonly mood: string;
};

export interface CharacterGenerationService {
  generateBase(
    input: GenerateBaseInput,
  ): Promise<{ readonly asset: GeneratedAssetRecord; readonly idempotent: boolean }>;
  acceptBase(ownerId: string, packId: string): Promise<void>;
  generateMood(
    input: GenerateMoodInput,
  ): Promise<{ readonly asset: GeneratedAssetRecord; readonly idempotent: boolean }>;
  generateMoodPack(
    input: Omit<GenerateBaseInput, "clientActionId"> & { readonly clientActionId: string },
  ): Promise<readonly GeneratedAssetRecord[]>;
  deletePack(ownerId: string, packId: string): Promise<{ readonly deletedObjects: number }>;
}

function extension(mimeType: string): string {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/avif") return "avif";
  return "png";
}

export function createCharacterGenerationService(options: {
  readonly store: CharacterGenerationStore;
  readonly safety: CharacterSafety;
  readonly provider: CharacterImageProvider;
  readonly storage: CharacterAssetBinaryStorage;
  readonly wallet: CharacterGenerationWallet;
  readonly baseCostBatteries: number;
  readonly moodCostBatteries: number;
}): CharacterGenerationService {
  async function execute(input: {
    readonly ownerId: string;
    readonly packId: string;
    readonly clientActionId: string;
    readonly kind: CharacterKind;
    readonly prompt: string;
    readonly actionKind: GenerationActionKind;
    readonly assetKind: "base" | "mood";
    readonly mood?: string;
    readonly costBatteries: number;
  }): Promise<{ readonly asset: GeneratedAssetRecord; readonly idempotent: boolean }> {
    const pack = await options.store.getCharacterPack(input.ownerId, input.packId);
    if (!pack) throw new Error("Character pack not found");
    const actionKey = makeActionIdempotencyKey(
      input.ownerId,
      input.actionKind,
      input.packId,
      input.clientActionId,
    );
    const claim = await options.store.claimGenerationAction({
      ownerId: input.ownerId,
      packId: input.packId,
      actionKey,
      actionKind: input.actionKind,
    });
    if (claim.state === "completed") return { asset: claim.asset, idempotent: true };
    if (claim.state === "busy") throw new CharacterGenerationBusyError();

    let reservationId = "";
    let settled = false;
    let uploadedPath = "";
    let persisted = false;
    try {
      const references = await options.store.listReferenceAssets(input.ownerId, input.packId);
      const referenceImages = await Promise.all(
        references.map((item) => options.storage.download(item.storagePath)),
      );
      if (input.assetKind === "base") {
        if (input.kind === "human") {
          await options.safety.reviewHumanReferences(referenceImages);
        } else {
          await options.safety.reviewRobotReferences(referenceImages);
        }
      }

      const reserved = await options.wallet.reserve({
        ownerId: input.ownerId,
        batteries: input.costBatteries,
        reason: input.actionKind,
        idempotencyKey: actionKey,
      });
      if (!reserved.ok) throw new CharacterGenerationPaymentError(reserved.code, reserved.message);
      reservationId = reserved.reservationId;

      let generated;
      if (input.assetKind === "base") {
        generated = await options.provider.generateBase({
          prompt: input.prompt,
          references: referenceImages,
        });
      } else {
        const base = (await options.store.listGeneratedAssets(input.ownerId, input.packId)).find(
          (asset) => asset.assetKind === "base",
        );
        if (!base) throw new Error("Accepted base character image not found");
        generated = await options.provider.generateMood({
          prompt: input.prompt,
          mood: input.mood ?? "neutral",
          base: await options.storage.download(base.storagePath),
        });
      }

      await options.safety.reviewGeneratedCharacter(generated);
      const assetId = randomUUID();
      const suffix = input.assetKind === "mood" ? `mood-${input.mood}` : "base";
      uploadedPath = `${input.ownerId}/${input.packId}/generated/${suffix}-${assetId}.${extension(generated.mimeType)}`;
      await options.storage.uploadGenerated(uploadedPath, generated);
      const candidate: GeneratedAssetRecord = {
        id: assetId,
        ownerId: input.ownerId,
        packId: input.packId,
        assetKind: input.assetKind,
        ...(input.mood ? { moodKey: input.mood } : {}),
        actionKey,
        storageBucket: CHARACTER_ASSET_BUCKET,
        storagePath: uploadedPath,
        mimeType: generated.mimeType,
        moderation: {
          input: input.kind === "human" ? "adult" : "not_applicable",
          output: "allowed",
        },
        provider: generated.providerId,
        model: generated.modelId,
      };
      let asset: GeneratedAssetRecord;
      if (!reserved.skipped && reserved.amountPowerUnits > 0) {
        asset = await options.store.settleCharacterGeneration({
          asset: candidate,
          claimToken: claim.claimToken,
          walletReservationId: reserved.reservationId,
          actionKind: input.actionKind,
          amountPowerUnits: reserved.amountPowerUnits,
          metadata: { assetId: candidate.id, mood: input.mood ?? null },
        });
        settled = true;
        persisted = true;
      } else {
        asset = await options.store.saveGeneratedAsset(candidate);
        persisted = true;
        if (input.assetKind === "base") {
          await options.store.saveCharacterPack({
            ...pack,
            status: "base_ready",
            provider: generated.providerId,
            model: generated.modelId,
          });
        }
        await options.store.completeGenerationAction({
          ownerId: input.ownerId,
          actionKey,
          claimToken: claim.claimToken,
          assetId: asset.id,
        });
      }
      return { asset, idempotent: false };
    } catch (error) {
      if (!settled && reservationId) {
        await options.wallet.refund(reservationId, `${input.actionKind}_failed`);
      }
      if (uploadedPath && !persisted) await options.storage.remove([uploadedPath]);
      if (!settled) {
        await options.store.failGenerationAction({
          ownerId: input.ownerId,
          actionKey,
          claimToken: claim.claimToken,
        });
      }
      throw error;
    }
  }

  return {
    generateBase(input) {
      return execute({
        ...input,
        actionKind: "character_base",
        assetKind: "base",
        costBatteries: options.baseCostBatteries,
      });
    },
    async acceptBase(ownerId, packId) {
      const pack = await options.store.getCharacterPack(ownerId, packId);
      if (!pack) throw new Error("Character pack not found");
      const base = (await options.store.listGeneratedAssets(ownerId, packId)).some(
        (asset) => asset.assetKind === "base",
      );
      if (!base) throw new Error("Generated base character image not found");
      await options.store.saveCharacterPack({ ...pack, status: "active" });
    },
    generateMood(input) {
      return execute({
        ...input,
        actionKind: "character_mood",
        assetKind: "mood",
        costBatteries: options.moodCostBatteries,
      });
    },
    async generateMoodPack(input) {
      const assets: GeneratedAssetRecord[] = [];
      for (const mood of INITIAL_CHARACTER_MOOD_KEYS) {
        const result = await execute({
          ...input,
          clientActionId: `${input.clientActionId}:${mood}`,
          mood,
          actionKind: "character_mood",
          assetKind: "mood",
          costBatteries: options.moodCostBatteries,
        });
        assets.push(result.asset);
      }
      return assets;
    },
    async deletePack(ownerId, packId) {
      const objects = await options.store.deleteCharacterPack(ownerId, packId);
      await options.storage.remove(objects.map((item) => item.storagePath));
      return { deletedObjects: objects.length };
    },
  };
}
