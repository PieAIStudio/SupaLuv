import { randomUUID } from "node:crypto";
import type { CharacterGenerationStore } from "./characterGenerationStore.js";
import type { EndingSessionStore } from "./endingSessionStore.js";
import { EndingVersionConflictError, ReceiptConflictError } from "./errors.js";
import type { SpendReceiptReader } from "./spendReceipts.js";
import { clone, sameReceipt } from "./shared.js";
import type {
  CharacterPackRecord,
  EndingCheckpointRecord,
  EndingSessionRecord,
  GeneratedAssetRecord,
  ReferenceAssetRecord,
  SpendReceiptInput,
  SpendReceiptRecord,
  StoryRunRecord,
  StoredObjectRecord,
} from "./types.js";

export type InMemoryPersistenceModules = {
  readonly characterGeneration: CharacterGenerationStore;
  readonly endingSession: EndingSessionStore;
  readonly spendReceipts: SpendReceiptReader;
};

type GenerationActionRow = {
  ownerId: string;
  packId: string;
  status: "in_progress" | "completed" | "failed";
  claimToken: string;
  assetId?: string;
};

function createReceiptLedger(receipts: Map<string, SpendReceiptRecord>) {
  return {
    async listSpendReceipts(ownerId: string): Promise<readonly SpendReceiptRecord[]> {
      return [...receipts.values()].filter((record) => record.ownerId === ownerId).map(clone);
    },
  };
}

export function createInMemoryPersistenceModules(): InMemoryPersistenceModules {
  const packs = new Map<string, CharacterPackRecord>();
  const references = new Map<string, ReferenceAssetRecord>();
  const generated = new Map<string, GeneratedAssetRecord>();
  const generationActions = new Map<string, GenerationActionRow>();
  const runs = new Map<string, StoryRunRecord>();
  const sessions = new Map<string, EndingSessionRecord>();
  const checkpointsByAction = new Map<string, EndingCheckpointRecord>();
  const receipts = new Map<string, SpendReceiptRecord>();
  const ledger = createReceiptLedger(receipts);

  const characterGeneration: CharacterGenerationStore = {
    async saveCharacterPack(record) {
      packs.set(record.id, clone(record));
      return clone(record);
    },
    async getCharacterPack(ownerId, packId) {
      const record = packs.get(packId);
      return record?.ownerId === ownerId ? clone(record) : null;
    },
    async listCharacterPacks(ownerId, slotId) {
      return [...packs.values()]
        .filter((record) => record.ownerId === ownerId && (!slotId || record.slotId === slotId))
        .map(clone);
    },
    async saveReferenceAsset(record) {
      const pack = packs.get(record.packId);
      if (!pack || pack.ownerId !== record.ownerId) throw new Error("character pack not found");
      references.set(record.id, clone(record));
      return clone(record);
    },
    async getReferenceAsset(ownerId, assetId) {
      const record = references.get(assetId);
      return record?.ownerId === ownerId ? clone(record) : null;
    },
    async listReferenceAssets(ownerId, packId) {
      return [...references.values()]
        .filter((record) => record.ownerId === ownerId && record.packId === packId)
        .map(clone);
    },
    async deleteReferenceAsset(ownerId, assetId) {
      const record = references.get(assetId);
      if (!record || record.ownerId !== ownerId) return null;
      references.delete(assetId);
      return {
        assetId: record.id,
        ownerId: record.ownerId,
        storageBucket: record.storageBucket,
        storagePath: record.storagePath,
      };
    },
    async expireReferenceAssets(beforeIso, limit) {
      const before = Date.parse(beforeIso);
      const expired = [...references.values()]
        .filter((record) => Date.parse(record.expiresAt) <= before)
        .slice(0, Math.max(0, limit));
      for (const record of expired) references.delete(record.id);
      return expired.map((record) => ({
        assetId: record.id,
        ownerId: record.ownerId,
        storageBucket: record.storageBucket,
        storagePath: record.storagePath,
      }));
    },
    async saveGeneratedAsset(record) {
      const pack = packs.get(record.packId);
      if (!pack || pack.ownerId !== record.ownerId) throw new Error("character pack not found");
      const replay = [...generated.values()].find(
        (item) => item.ownerId === record.ownerId && item.actionKey === record.actionKey,
      );
      if (replay) return clone(replay);
      generated.set(record.id, clone(record));
      return clone(record);
    },
    async getGeneratedAssetByActionKey(ownerId, actionKey) {
      const record = [...generated.values()].find(
        (item) => item.ownerId === ownerId && item.actionKey === actionKey,
      );
      return record ? clone(record) : null;
    },
    async listGeneratedAssets(ownerId, packId) {
      return [...generated.values()]
        .filter((item) => item.ownerId === ownerId && item.packId === packId)
        .map(clone);
    },
    async deleteCharacterPack(ownerId, packId) {
      const pack = packs.get(packId);
      if (!pack || pack.ownerId !== ownerId) return [];
      const objects: StoredObjectRecord[] = [];
      for (const [id, item] of [...references.entries()]) {
        if (item.ownerId === ownerId && item.packId === packId) {
          objects.push({
            assetId: id,
            ownerId,
            storageBucket: item.storageBucket,
            storagePath: item.storagePath,
          });
          references.delete(id);
        }
      }
      for (const [id, item] of [...generated.entries()]) {
        if (item.ownerId === ownerId && item.packId === packId) {
          objects.push({
            assetId: id,
            ownerId,
            storageBucket: item.storageBucket,
            storagePath: item.storagePath,
          });
          generated.delete(id);
        }
      }
      packs.set(packId, { ...pack, status: "deleted" });
      return objects;
    },
    async claimGenerationAction(input) {
      const identity = `${input.ownerId}:${input.actionKey}`;
      const existing = generationActions.get(identity);
      if (existing?.status === "completed" && existing.assetId) {
        const asset = generated.get(existing.assetId);
        if (!asset) throw new Error("completed generation asset not found");
        return { state: "completed", asset: clone(asset) };
      }
      if (existing?.status === "in_progress") return { state: "busy" };
      const another = [...generationActions.values()].some(
        (action) =>
          action.ownerId === input.ownerId &&
          action.packId === input.packId &&
          action.status === "in_progress",
      );
      if (another) return { state: "busy" };
      const claimToken = randomUUID();
      generationActions.set(identity, {
        ownerId: input.ownerId,
        packId: input.packId,
        status: "in_progress",
        claimToken,
      });
      return { state: "claimed", claimToken };
    },
    async completeGenerationAction(input) {
      const identity = `${input.ownerId}:${input.actionKey}`;
      const action = generationActions.get(identity);
      if (!action || action.claimToken !== input.claimToken || action.status !== "in_progress") {
        throw new Error("generation claim is no longer valid");
      }
      generationActions.set(identity, { ...action, status: "completed", assetId: input.assetId });
    },
    async settleCharacterGeneration(input) {
      const identity = `${input.asset.ownerId}:${input.asset.actionKey}`;
      const action = generationActions.get(identity);
      if (
        !action ||
        action.claimToken !== input.claimToken ||
        action.status !== "in_progress" ||
        action.packId !== input.asset.packId
      ) {
        throw new Error("generation claim is no longer valid");
      }
      const pack = packs.get(input.asset.packId);
      if (!pack || pack.ownerId !== input.asset.ownerId)
        throw new Error("character pack not found");
      const receiptInput: SpendReceiptInput = {
        ownerId: input.asset.ownerId,
        walletReservationId: input.walletReservationId,
        actionKind: input.actionKind,
        scopeType: "character_pack",
        scopeId: input.asset.packId,
        amountPowerUnits: input.amountPowerUnits,
        metadata: input.metadata,
      };
      const existingReceipt = receipts.get(input.walletReservationId);
      if (existingReceipt && !sameReceipt(existingReceipt, receiptInput))
        throw new ReceiptConflictError();

      generated.set(input.asset.id, clone(input.asset));
      generationActions.set(identity, {
        ...action,
        status: "completed",
        assetId: input.asset.id,
      });
      if (input.asset.assetKind === "base") {
        packs.set(input.asset.packId, {
          ...pack,
          status: "base_ready",
          provider: input.asset.provider,
          model: input.asset.model,
        });
      }
      if (!existingReceipt) {
        receipts.set(input.walletReservationId, {
          ...clone(receiptInput),
          id: randomUUID(),
          idempotent: false,
        });
      }
      return clone(input.asset);
    },
    async failGenerationAction(input) {
      const identity = `${input.ownerId}:${input.actionKey}`;
      const action = generationActions.get(identity);
      if (action?.claimToken === input.claimToken && action.status === "in_progress") {
        generationActions.set(identity, { ...action, status: "failed" });
      }
    },
  };

  const endingSession: EndingSessionStore = {
    async saveStoryRun(record) {
      runs.set(record.id, clone(record));
      return clone(record);
    },
    async getStoryRun(ownerId, runId) {
      const record = runs.get(runId);
      return record?.ownerId === ownerId ? clone(record) : null;
    },
    async saveEndingSession(record) {
      sessions.set(record.id, clone(record));
      return clone(record);
    },
    async getEndingSession(ownerId, sessionId) {
      const record = sessions.get(sessionId);
      return record?.ownerId === ownerId ? clone(record) : null;
    },
    async getEndingSessionByClientId(ownerId, clientSessionId) {
      const record = [...sessions.values()].find(
        (item) => item.ownerId === ownerId && item.clientSessionId === clientSessionId,
      );
      return record ? clone(record) : null;
    },
    async advanceEndingCheckpoint(input) {
      const session = sessions.get(input.sessionId);
      if (!session || session.ownerId !== input.ownerId)
        throw new Error("AI ending session not found");
      const actionIdentity = `${input.sessionId}:${input.actionKey}`;
      const replay = checkpointsByAction.get(actionIdentity);
      if (replay) return { ...clone(replay), idempotent: true };
      if (session.currentVersion !== input.expectedVersion) {
        throw new EndingVersionConflictError();
      }
      if (session.currentSequence >= session.maxSegments) {
        throw new Error("AI ending session reached max segments");
      }

      const checkpoint: EndingCheckpointRecord = {
        id: randomUUID(),
        ownerId: input.ownerId,
        sessionId: input.sessionId,
        sequence: session.currentSequence + 1,
        sessionVersion: session.currentVersion + 1,
        actionKey: input.actionKey,
        terminal: input.terminal,
        idempotent: false,
        playerAction: clone(input.playerAction),
        segment: clone(input.segment),
        choices: clone(input.choices),
        continuity: clone(input.continuity),
      };
      checkpointsByAction.set(actionIdentity, checkpoint);
      sessions.set(input.sessionId, {
        ...session,
        status: input.terminal ? "completed" : "active",
        currentSequence: checkpoint.sequence,
        currentVersion: checkpoint.sessionVersion,
        continuity: clone(input.continuity),
      });
      return clone(checkpoint);
    },
    async settleEndingCheckpoint(input) {
      const receiptInput: SpendReceiptInput = {
        ownerId: input.ownerId,
        walletReservationId: input.walletReservationId,
        actionKind: "ai_ending_segment",
        scopeType: "ai_ending_session",
        scopeId: input.sessionId,
        amountPowerUnits: input.amountPowerUnits,
        metadata: input.metadata,
      };
      const existingReceipt = receipts.get(input.walletReservationId);
      if (existingReceipt && !sameReceipt(existingReceipt, receiptInput))
        throw new ReceiptConflictError();
      const checkpoint = await endingSession.advanceEndingCheckpoint(input);
      if (!existingReceipt) {
        receipts.set(input.walletReservationId, {
          ...clone(receiptInput),
          id: randomUUID(),
          idempotent: false,
        });
      }
      return checkpoint;
    },
    async listEndingCheckpoints(ownerId, sessionId) {
      return [...checkpointsByAction.values()]
        .filter((item) => item.ownerId === ownerId && item.sessionId === sessionId)
        .sort((a, b) => a.sequence - b.sequence)
        .map(clone);
    },
  };

  return {
    characterGeneration,
    endingSession,
    spendReceipts: {
      listSpendReceipts: ledger.listSpendReceipts,
    },
  };
}
