import { describe, expect, it, vi } from "vitest";
import type { CharacterSafety } from "../../services/ai-branch/src/characterSafety";
import type { CharacterImageProvider } from "../../services/ai-branch/src/characterImageProvider";
import type { CharacterAssetBinaryStorage } from "../../services/ai-branch/src/characterAssetService";
import {
  CharacterGenerationBusyError,
  createCharacterGenerationService,
  type CharacterGenerationWallet,
} from "../../services/ai-branch/src/characterGenerationService";
import { createInMemorySupaluvStore } from "../../services/ai-branch/src/supaluvStore";

const reference = { bytes: Buffer.from("reference"), mimeType: "image/jpeg" as const };
const generated = {
  bytes: Buffer.from("generated"),
  mimeType: "image/png" as const,
  providerId: "openrouter",
  modelId: "google/gemini-3.1-flash-image",
  providerRequestMetadata: {
    interactionId: "interaction-1",
    referenceCount: 1,
    purpose: "base" as const,
  },
};

async function setup() {
  const events: string[] = [];
  const store = createInMemorySupaluvStore();
  await store.saveCharacterPack({
    id: "pack-1",
    ownerId: "owner-a",
    clientPackId: "client-pack-1",
    slotId: "lead_suming",
    status: "draft",
    brief: { text: "robotics founder" },
  });
  await store.saveReferenceAsset({
    id: "ref-1",
    ownerId: "owner-a",
    packId: "pack-1",
    referenceIndex: 0,
    storageBucket: "supaluv-character-assets",
    storagePath: "owner-a/pack-1/references/ref-1.jpg",
    mimeType: "image/jpeg",
    expiresAt: "2027-01-01T00:00:00.000Z",
  });
  const safety: CharacterSafety = {
    reviewHumanReferences: vi.fn(async () => {
      events.push("input-safety");
      return { allowed: true as const };
    }),
    reviewRobotReferences: vi.fn(async () => {
      events.push("input-safety");
      return { allowed: true as const };
    }),
    reviewGeneratedCharacter: vi.fn(async () => {
      events.push("output-safety");
      return { allowed: true as const };
    }),
  };
  const provider: CharacterImageProvider = {
    generateBase: vi.fn(async () => {
      events.push("generate");
      return generated;
    }),
    generateMood: vi.fn(async () => generated),
    generateStill: vi.fn(async () => generated),
  };
  const storage: CharacterAssetBinaryStorage = {
    createSignedUpload: vi.fn(),
    inspect: vi.fn(),
    remove: vi.fn(async () => undefined),
    download: vi.fn(async () => reference),
    uploadGenerated: vi.fn(async () => {
      events.push("store-image");
    }),
    createSignedDownload: vi.fn(async (path: string) => `https://private.invalid/${path}`),
  };
  const wallet: CharacterGenerationWallet = {
    // Each paid action receives a different ledger reservation in this fake.
    reserve: vi.fn(async () => {
      events.push("reserve");
      const reservationId = `reservation-${vi.mocked(wallet.reserve).mock.calls.length}`;
      return { ok: true as const, reservationId, amountPowerUnits: 100, skipped: false };
    }),
    commit: vi.fn(async () => {
      events.push("commit");
    }),
    refund: vi.fn(async () => {
      events.push("refund");
    }),
  };
  const service = createCharacterGenerationService({
    store,
    safety,
    provider,
    storage,
    wallet,
    baseCostBatteries: 1,
    moodCostBatteries: 1,
  });
  return { events, store, safety, provider, storage, wallet, service };
}

describe("character generation coordinator", () => {
  it("orders safety, reservation, generation, output safety, and atomic persistence/settlement", async () => {
    const context = await setup();

    const result = await context.service.generateBase({
      ownerId: "owner-a",
      packId: "pack-1",
      clientActionId: "action-1",
      kind: "human",
      prompt: "Cinematic adult portrait",
    });

    expect(context.events).toEqual([
      "input-safety",
      "reserve",
      "generate",
      "output-safety",
      "store-image",
    ]);
    expect(context.wallet.commit).not.toHaveBeenCalled();
    expect(result.asset).toMatchObject({
      assetKind: "base",
      actionKey: expect.any(String),
      provider: "openrouter",
      model: "google/gemini-3.1-flash-image",
    });
    await expect(context.store.listSpendReceipts("owner-a")).resolves.toHaveLength(1);
  });

  it("refunds and removes the uploaded image when atomic settlement fails", async () => {
    const context = await setup();
    vi.spyOn(context.store, "settleCharacterGeneration").mockRejectedValueOnce(
      new Error("atomic settlement failed"),
    );

    await expect(
      context.service.generateBase({
        ownerId: "owner-a",
        packId: "pack-1",
        clientActionId: "action-settlement-failure",
        kind: "human",
        prompt: "portrait",
      }),
    ).rejects.toThrow("atomic settlement failed");

    expect(context.wallet.refund).toHaveBeenCalledWith("reservation-1", "character_base_failed");
    expect(context.storage.remove).toHaveBeenCalledWith([
      expect.stringContaining("generated/base-"),
    ]);
    await expect(context.store.listGeneratedAssets("owner-a", "pack-1")).resolves.toEqual([]);
  });

  it("refunds and releases the distributed claim when generation fails", async () => {
    const context = await setup();
    vi.mocked(context.provider.generateBase).mockRejectedValueOnce(new Error("provider failed"));

    await expect(
      context.service.generateBase({
        ownerId: "owner-a",
        packId: "pack-1",
        clientActionId: "action-1",
        kind: "human",
        prompt: "portrait",
      }),
    ).rejects.toThrow("provider failed");
    expect(context.wallet.refund).toHaveBeenCalledWith("reservation-1", "character_base_failed");

    await expect(
      context.service.generateBase({
        ownerId: "owner-a",
        packId: "pack-1",
        clientActionId: "action-1",
        kind: "human",
        prompt: "portrait",
      }),
    ).resolves.toHaveProperty("asset");
  });

  it("returns the completed asset for an idempotent retry without generating or charging again", async () => {
    const context = await setup();
    const input = {
      ownerId: "owner-a",
      packId: "pack-1",
      clientActionId: "action-1",
      kind: "human" as const,
      prompt: "portrait",
    };
    const first = await context.service.generateBase(input);
    const replay = await context.service.generateBase(input);

    expect(replay).toEqual({ asset: first.asset, idempotent: true });
    expect(context.provider.generateBase).toHaveBeenCalledOnce();
    expect(context.wallet.reserve).toHaveBeenCalledOnce();
  });

  it("allows only one in-flight action per pack", async () => {
    const context = await setup();
    let release!: () => void;
    vi.mocked(context.provider.generateBase).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve(generated);
        }),
    );
    const first = context.service.generateBase({
      ownerId: "owner-a",
      packId: "pack-1",
      clientActionId: "action-1",
      kind: "human",
      prompt: "portrait",
    });
    await vi.waitFor(() => expect(context.provider.generateBase).toHaveBeenCalledOnce());

    await expect(
      context.service.generateBase({
        ownerId: "owner-a",
        packId: "pack-1",
        clientActionId: "action-2",
        kind: "human",
        prompt: "portrait 2",
      }),
    ).rejects.toBeInstanceOf(CharacterGenerationBusyError);
    release();
    await first;
  });

  it("accepts a base, builds the six initial moods, and deletes the private pack assets", async () => {
    const context = await setup();
    await context.service.generateBase({
      ownerId: "owner-a",
      packId: "pack-1",
      clientActionId: "base-1",
      kind: "human",
      prompt: "portrait",
    });
    await context.service.acceptBase("owner-a", "pack-1");
    const moods = await context.service.generateMoodPack({
      ownerId: "owner-a",
      packId: "pack-1",
      clientActionId: "moods-1",
      kind: "human",
      prompt: "same identity",
    });

    expect(moods.map((asset) => asset.moodKey)).toEqual([
      "neutral",
      "happy",
      "awkward",
      "angry",
      "surprised",
      "sad",
    ]);
    expect(context.provider.generateMood).toHaveBeenCalledTimes(6);
    await expect(context.store.getCharacterPack("owner-a", "pack-1")).resolves.toMatchObject({
      status: "active",
    });

    const deleted = await context.service.deletePack("owner-a", "pack-1");
    expect(deleted.deletedObjects).toBe(8);
    expect(context.storage.remove).toHaveBeenCalledWith(
      expect.arrayContaining(["owner-a/pack-1/references/ref-1.jpg"]),
    );
  });
});
