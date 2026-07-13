import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createConfiguredPersistenceModules,
  createInMemoryPersistenceModules,
  createSupabasePersistenceModules,
  EndingVersionConflictError,
  type CharacterGenerationStore,
  type EndingSessionStore,
  type PersistenceModules,
} from "../../services/ai-branch/src/persistence/index";
import { describe, expect, it, vi } from "vitest";

function memory(): PersistenceModules {
  return createInMemoryPersistenceModules();
}

const DELETED_SIDE_BRANCH_SYMBOLS = [
  "SideBranchSpendRecorder",
  "recordSideBranchSpend",
  "SideBranchSpendInput",
  "sideBranchSpend",
] as const;

async function seedPack(store: CharacterGenerationStore, ownerId = "owner-a", packId = "pack-1") {
  await store.saveCharacterPack({
    id: packId,
    ownerId,
    clientPackId: `client-${packId}`,
    slotId: "lead_suming",
    status: "draft",
    brief: {},
  });
}

async function seedSession(
  store: EndingSessionStore,
  ownerId = "owner-a",
  sessionId = "session-1",
) {
  await store.saveEndingSession({
    id: sessionId,
    ownerId,
    storyRunId: "run-1",
    clientSessionId: `client-${sessionId}`,
    entryId: "final-choice",
    status: "active",
    currentVersion: 0,
    currentSequence: 0,
    maxSegments: 8,
    continuity: {},
  });
}

const checkpointBase = {
  ownerId: "owner-a",
  sessionId: "session-1",
  expectedVersion: 0,
  actionKey: "action-1",
  playerAction: { kind: "choice", choiceId: "stay" },
  segment: { text: "First segment" },
  choices: [
    { id: "stay", label: "Stay" },
    { id: "leave", label: "Leave" },
  ],
  continuity: { facts: ["truth"] },
  terminal: false,
} as const;

describe("commercial persistence modules (in-memory)", () => {
  it("never returns another owner's character pack (owner isolation)", async () => {
    const { characterGeneration: store } = memory();
    await seedPack(store);

    await expect(store.getCharacterPack("owner-a", "pack-1")).resolves.toMatchObject({
      id: "pack-1",
    });
    await expect(store.getCharacterPack("owner-b", "pack-1")).resolves.toBeNull();
    await expect(store.listCharacterPacks("owner-b")).resolves.toEqual([]);
  });

  it("expires reference assets by cutoff and returns storage cleanup objects", async () => {
    const { characterGeneration: store } = memory();
    await seedPack(store);
    await store.saveReferenceAsset({
      id: "ref-old",
      ownerId: "owner-a",
      packId: "pack-1",
      referenceIndex: 0,
      storageBucket: "supaluv-character-assets",
      storagePath: "owner-a/pack-1/references/ref-old.jpg",
      mimeType: "image/jpeg",
      expiresAt: "2020-01-01T00:00:00.000Z",
    });
    await store.saveReferenceAsset({
      id: "ref-new",
      ownerId: "owner-a",
      packId: "pack-1",
      referenceIndex: 1,
      storageBucket: "supaluv-character-assets",
      storagePath: "owner-a/pack-1/references/ref-new.jpg",
      mimeType: "image/jpeg",
      expiresAt: "2030-01-01T00:00:00.000Z",
    });

    const expired = await store.expireReferenceAssets("2025-01-01T00:00:00.000Z", 10);
    expect(expired).toEqual([
      expect.objectContaining({
        assetId: "ref-old",
        storagePath: "owner-a/pack-1/references/ref-old.jpg",
      }),
    ]);
    await expect(store.listReferenceAssets("owner-a", "pack-1")).resolves.toEqual([
      expect.objectContaining({ id: "ref-new" }),
    ]);
  });

  it("claims generation actions with busy/replay semantics and fail release", async () => {
    const { characterGeneration: store } = memory();
    await seedPack(store);

    const first = await store.claimGenerationAction({
      ownerId: "owner-a",
      packId: "pack-1",
      actionKey: "action-1",
      actionKind: "character_base",
    });
    expect(first).toMatchObject({ state: "claimed" });

    await expect(
      store.claimGenerationAction({
        ownerId: "owner-a",
        packId: "pack-1",
        actionKey: "action-2",
        actionKind: "character_base",
      }),
    ).resolves.toEqual({ state: "busy" });

    if (first.state !== "claimed") throw new Error("expected claim");
    await store.failGenerationAction({
      ownerId: "owner-a",
      actionKey: "action-1",
      claimToken: first.claimToken,
    });

    const retry = await store.claimGenerationAction({
      ownerId: "owner-a",
      packId: "pack-1",
      actionKey: "action-1",
      actionKind: "character_base",
    });
    expect(retry.state).toBe("claimed");
    if (retry.state !== "claimed") throw new Error("expected claim");

    const asset = {
      id: "asset-1",
      ownerId: "owner-a",
      packId: "pack-1",
      assetKind: "base" as const,
      actionKey: "action-1",
      storageBucket: "bucket",
      storagePath: "path",
      mimeType: "image/png",
      moderation: {},
      provider: "openrouter",
      model: "model",
    };
    await store.settleCharacterGeneration({
      asset,
      claimToken: retry.claimToken,
      walletReservationId: "reservation-1",
      actionKind: "character_base",
      amountPowerUnits: 100,
      metadata: {},
    });

    await expect(
      store.claimGenerationAction({
        ownerId: "owner-a",
        packId: "pack-1",
        actionKey: "action-1",
        actionKind: "character_base",
      }),
    ).resolves.toMatchObject({
      state: "completed",
      asset: expect.objectContaining({ id: "asset-1" }),
    });
  });

  it("settles character generation atomically with receipt idempotency and conflict", async () => {
    const modules = memory();
    const store = modules.characterGeneration;
    await seedPack(store);
    const claim = await store.claimGenerationAction({
      ownerId: "owner-a",
      packId: "pack-1",
      actionKey: "action-settle",
      actionKind: "character_base",
    });
    if (claim.state !== "claimed") throw new Error("expected claim");

    const asset = {
      id: "asset-settle",
      ownerId: "owner-a",
      packId: "pack-1",
      assetKind: "base" as const,
      actionKey: "action-settle",
      storageBucket: "bucket",
      storagePath: "path",
      mimeType: "image/png",
      moderation: {},
      provider: "openrouter",
      model: "model",
    };
    const first = await store.settleCharacterGeneration({
      asset,
      claimToken: claim.claimToken,
      walletReservationId: "reservation-settle",
      actionKind: "character_base",
      amountPowerUnits: 100,
      metadata: { slotId: "lead_suming" },
    });
    expect(first.id).toBe("asset-settle");
    await expect(modules.spendReceipts.listSpendReceipts("owner-a")).resolves.toHaveLength(1);
    await expect(store.getCharacterPack("owner-a", "pack-1")).resolves.toMatchObject({
      status: "base_ready",
    });
    // Receipt list remains owner-scoped and read-only (no side-branch writer surface).
    expect(modules).not.toHaveProperty("sideBranchSpend");

    // Failed claim token is rejected.
    await seedPack(store, "owner-a", "pack-2");
    const busyClaim = await store.claimGenerationAction({
      ownerId: "owner-a",
      packId: "pack-2",
      actionKey: "action-fail-claim",
      actionKind: "character_base",
    });
    if (busyClaim.state !== "claimed") throw new Error("expected claim");
    await expect(
      store.settleCharacterGeneration({
        asset: { ...asset, id: "asset-x", packId: "pack-2", actionKey: "action-fail-claim" },
        claimToken: "wrong-token",
        walletReservationId: "reservation-wrong",
        actionKind: "character_base",
        amountPowerUnits: 100,
        metadata: {},
      }),
    ).rejects.toThrow(/claim is no longer valid/i);
  });

  it("advances an ending once, replays the same action, and rejects a stale new action", async () => {
    const { endingSession: store } = memory();
    await seedSession(store);

    const first = await store.advanceEndingCheckpoint(checkpointBase);
    const replay = await store.advanceEndingCheckpoint(checkpointBase);

    expect(first).toMatchObject({ sequence: 1, sessionVersion: 1, idempotent: false });
    expect(replay).toMatchObject({ id: first.id, idempotent: true });
    await expect(
      store.advanceEndingCheckpoint({ ...checkpointBase, actionKey: "action-2" }),
    ).rejects.toBeInstanceOf(EndingVersionConflictError);
  });

  it("settles ending checkpoints with atomic receipt write, terminal state, and start/resume", async () => {
    const modules = memory();
    const store = modules.endingSession;
    await store.saveStoryRun({
      id: "run-1",
      ownerId: "owner-a",
      clientRunId: "client-run-1",
      storyId: "ch01",
      status: "active",
      characterBindings: {},
    });
    await seedSession(store);

    const settled = await store.settleEndingCheckpoint({
      ...checkpointBase,
      walletReservationId: "ending-reservation-1",
      amountPowerUnits: 80,
      metadata: { sequence: 1 },
    });
    expect(settled).toMatchObject({ sequence: 1, idempotent: false });
    await expect(modules.spendReceipts.listSpendReceipts("owner-a")).resolves.toHaveLength(1);

    const replay = await store.settleEndingCheckpoint({
      ...checkpointBase,
      walletReservationId: "ending-reservation-1",
      amountPowerUnits: 80,
      metadata: { sequence: 1 },
    });
    expect(replay).toMatchObject({ id: settled.id, idempotent: true });
    await expect(modules.spendReceipts.listSpendReceipts("owner-a")).resolves.toHaveLength(1);

    const session = await store.getEndingSession("owner-a", "session-1");
    expect(session).toMatchObject({ currentVersion: 1, currentSequence: 1, status: "active" });

    const terminal = await store.settleEndingCheckpoint({
      ...checkpointBase,
      expectedVersion: 1,
      actionKey: "action-terminal",
      terminal: true,
      segment: { text: "The end" },
      choices: [],
      walletReservationId: "ending-reservation-2",
      amountPowerUnits: 80,
      metadata: { sequence: 2 },
    });
    expect(terminal.terminal).toBe(true);
    await expect(store.getEndingSession("owner-a", "session-1")).resolves.toMatchObject({
      status: "completed",
      currentSequence: 2,
    });

    const byClient = await store.getEndingSessionByClientId("owner-a", "client-session-1");
    expect(byClient?.id).toBe("session-1");
    const checkpoints = await store.listEndingCheckpoints("owner-a", "session-1");
    expect(checkpoints).toHaveLength(2);
  });

  it("does not expose the deleted SideBranchSpendRecorder surface", () => {
    const modules = memory();
    expect(modules).not.toHaveProperty("sideBranchSpend");
    expect(Object.keys(modules).sort()).toEqual([
      "characterGeneration",
      "endingSession",
      "spendReceipts",
    ]);

    const persistenceRoot = join(process.cwd(), "services/ai-branch/src/persistence");
    for (const name of [
      "types.ts",
      "spendReceipts.ts",
      "index.ts",
      "compose.ts",
      "memory.ts",
      "supabase.ts",
      "README.md",
    ] as const) {
      const source = readFileSync(join(persistenceRoot, name), "utf8");
      for (const symbol of DELETED_SIDE_BRANCH_SYMBOLS) {
        expect(source).not.toContain(symbol);
      }
      expect(source).not.toContain("record_spend_receipt");
    }
  });

  it("fails closed in production when server credentials are absent", () => {
    const clientFactory = vi.fn();

    expect(() =>
      createConfiguredPersistenceModules({
        mode: "production",
        supabaseUrl: "",
        serviceRoleKey: "",
        clientFactory,
      }),
    ).toThrow(/credentials/i);
    expect(clientFactory).not.toHaveBeenCalled();
  });

  it("pins the remote adapter to the SupaLuv product schema", () => {
    const schema = vi.fn(() => ({}));
    const client = { schema } as unknown as Parameters<typeof createSupabasePersistenceModules>[0];

    createSupabasePersistenceModules(client);

    expect(schema).toHaveBeenCalledOnce();
    expect(schema).toHaveBeenCalledWith("supaluv");
  });
});

/**
 * Contract matrix: identical observable cases against every adapter the repo can run
 * without production secrets. Full Supabase behavioural matrix is unavailable without
 * safe local DB infrastructure in this repository.
 */
describe("persistence contract matrix", () => {
  const adapters: Array<{ name: string; create: () => PersistenceModules }> = [
    { name: "in-memory", create: createInMemoryPersistenceModules },
  ];

  for (const adapter of adapters) {
    describe(adapter.name, () => {
      it("owner isolation + claim busy + settle receipt + ending optimistic conflict", async () => {
        const modules = adapter.create();
        const character = modules.characterGeneration;
        const ending = modules.endingSession;

        await seedPack(character);
        await expect(character.getCharacterPack("owner-b", "pack-1")).resolves.toBeNull();

        const claim = await character.claimGenerationAction({
          ownerId: "owner-a",
          packId: "pack-1",
          actionKey: "matrix-action",
          actionKind: "character_base",
        });
        expect(claim.state).toBe("claimed");
        await expect(
          character.claimGenerationAction({
            ownerId: "owner-a",
            packId: "pack-1",
            actionKey: "matrix-action-2",
            actionKind: "character_base",
          }),
        ).resolves.toEqual({ state: "busy" });

        if (claim.state !== "claimed") throw new Error("expected claim");
        await character.settleCharacterGeneration({
          asset: {
            id: "matrix-asset",
            ownerId: "owner-a",
            packId: "pack-1",
            assetKind: "base",
            actionKey: "matrix-action",
            storageBucket: "b",
            storagePath: "p",
            mimeType: "image/png",
            moderation: {},
            provider: "p",
            model: "m",
          },
          claimToken: claim.claimToken,
          walletReservationId: "matrix-reservation",
          actionKind: "character_base",
          amountPowerUnits: 100,
          metadata: {},
        });
        await expect(modules.spendReceipts.listSpendReceipts("owner-a")).resolves.toHaveLength(1);

        await seedSession(ending, "owner-a", "matrix-session");
        await ending.advanceEndingCheckpoint({
          ...checkpointBase,
          sessionId: "matrix-session",
          actionKey: "matrix-ending-1",
        });
        await expect(
          ending.advanceEndingCheckpoint({
            ...checkpointBase,
            sessionId: "matrix-session",
            actionKey: "matrix-ending-2",
          }),
        ).rejects.toBeInstanceOf(EndingVersionConflictError);
      });
    });
  }
});
