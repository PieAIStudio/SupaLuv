import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

export class EndingVersionConflictError extends Error {
  constructor() {
    super("AI ending session version conflict");
    this.name = "EndingVersionConflictError";
  }
}

export class ReceiptConflictError extends Error {
  constructor() {
    super("wallet reservation already has a conflicting receipt");
    this.name = "ReceiptConflictError";
  }
}

export interface SupaluvStore {
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
  saveStoryRun(record: StoryRunRecord): Promise<StoryRunRecord>;
  getStoryRun(ownerId: string, runId: string): Promise<StoryRunRecord | null>;
  saveEndingSession(record: EndingSessionRecord): Promise<EndingSessionRecord>;
  getEndingSession(ownerId: string, sessionId: string): Promise<EndingSessionRecord | null>;
  getEndingSessionByClientId(
    ownerId: string,
    clientSessionId: string,
  ): Promise<EndingSessionRecord | null>;
  advanceEndingCheckpoint(input: AdvanceEndingCheckpointInput): Promise<EndingCheckpointRecord>;
  settleEndingCheckpoint(input: SettleEndingCheckpointInput): Promise<EndingCheckpointRecord>;
  listEndingCheckpoints(
    ownerId: string,
    sessionId: string,
  ): Promise<readonly EndingCheckpointRecord[]>;
  recordSpendReceipt(input: SpendReceiptInput): Promise<SpendReceiptRecord>;
  listSpendReceipts(ownerId: string): Promise<readonly SpendReceiptRecord[]>;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function sameReceipt(left: SpendReceiptInput, right: SpendReceiptInput): boolean {
  return (
    left.ownerId === right.ownerId &&
    left.actionKind === right.actionKind &&
    left.scopeType === right.scopeType &&
    left.scopeId === right.scopeId &&
    left.amountPowerUnits === right.amountPowerUnits
  );
}

export function createInMemorySupaluvStore(): SupaluvStore {
  const packs = new Map<string, CharacterPackRecord>();
  const references = new Map<string, ReferenceAssetRecord>();
  const generated = new Map<string, GeneratedAssetRecord>();
  const generationActions = new Map<
    string,
    {
      ownerId: string;
      packId: string;
      status: "in_progress" | "completed" | "failed";
      claimToken: string;
      assetId?: string;
    }
  >();
  const runs = new Map<string, StoryRunRecord>();
  const sessions = new Map<string, EndingSessionRecord>();
  const checkpointsByAction = new Map<string, EndingCheckpointRecord>();
  const receipts = new Map<string, SpendReceiptRecord>();

  return {
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
      const checkpoint = await this.advanceEndingCheckpoint(input);
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
    async recordSpendReceipt(input) {
      const existing = receipts.get(input.walletReservationId);
      if (existing) {
        if (!sameReceipt(existing, input)) throw new ReceiptConflictError();
        return { ...clone(existing), idempotent: true };
      }
      const receipt: SpendReceiptRecord = { ...clone(input), id: randomUUID(), idempotent: false };
      receipts.set(input.walletReservationId, receipt);
      return clone(receipt);
    },
    async listSpendReceipts(ownerId) {
      return [...receipts.values()].filter((record) => record.ownerId === ownerId).map(clone);
    },
  };
}

type DatabaseError = { readonly message: string; readonly code?: string };
type DatabaseResult<T> = { readonly data: T; readonly error: DatabaseError | null };

function requireData<T>(result: DatabaseResult<T>, operation: string): T {
  if (result.error) throw new Error(`${operation}: ${result.error.message}`);
  return result.data;
}

function asRow(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("database returned an invalid row");
  }
  return value as Record<string, unknown>;
}

function mapPack(value: unknown): CharacterPackRecord {
  const row = asRow(value);
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    clientPackId: String(row.client_pack_id),
    slotId: String(row.slot_id),
    status: row.status as CharacterPackRecord["status"],
    brief: (row.brief ?? {}) as Readonly<Record<string, unknown>>,
    ...(row.provider ? { provider: String(row.provider) } : {}),
    ...(row.model ? { model: String(row.model) } : {}),
  };
}

function mapGeneratedAsset(value: unknown): GeneratedAssetRecord {
  const row = asRow(value);
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    packId: String(row.pack_id),
    assetKind: row.asset_kind as GeneratedAssetRecord["assetKind"],
    ...(row.mood_key ? { moodKey: String(row.mood_key) } : {}),
    actionKey: String(row.generation_action_key),
    storageBucket: String(row.storage_bucket),
    storagePath: String(row.storage_path),
    mimeType: String(row.mime_type),
    moderation: (row.moderation ?? {}) as Readonly<Record<string, unknown>>,
    provider: String(row.provider),
    model: String(row.model),
  };
}

export function createSupabaseSupaluvStore(client: SupabaseClient): SupaluvStore {
  const product = client.schema("supaluv");

  return {
    async saveCharacterPack(record) {
      const result = await product
        .from("character_packs")
        .upsert({
          id: record.id,
          owner_id: record.ownerId,
          client_pack_id: record.clientPackId,
          slot_id: record.slotId,
          status: record.status,
          brief: record.brief,
          provider: record.provider ?? null,
          model: record.model ?? null,
        })
        .select("*")
        .single();
      return mapPack(requireData(result, "save character pack"));
    },
    async getCharacterPack(ownerId, packId) {
      const result = await product
        .from("character_packs")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("id", packId)
        .maybeSingle();
      return result.data ? mapPack(requireData(result, "get character pack")) : null;
    },
    async listCharacterPacks(ownerId, slotId) {
      let query = product
        .from("character_packs")
        .select("*")
        .eq("owner_id", ownerId)
        .is("deleted_at", null);
      if (slotId) query = query.eq("slot_id", slotId);
      const result = await query.order("updated_at", { ascending: false });
      return (requireData(result, "list character packs") ?? []).map(mapPack);
    },
    async saveReferenceAsset(record) {
      const result = await product
        .from("character_assets")
        .upsert({
          id: record.id,
          owner_id: record.ownerId,
          pack_id: record.packId,
          asset_kind: "reference",
          reference_index: record.referenceIndex,
          storage_bucket: record.storageBucket,
          storage_path: record.storagePath,
          mime_type: record.mimeType,
          expires_at: record.expiresAt,
        })
        .select("*")
        .single();
      const row = asRow(requireData(result, "save reference asset"));
      return { ...record, id: String(row.id) };
    },
    async getReferenceAsset(ownerId, assetId) {
      const result = await product
        .from("character_assets")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("id", assetId)
        .eq("asset_kind", "reference")
        .is("deleted_at", null)
        .maybeSingle();
      if (!result.data) return null;
      const row = asRow(requireData(result, "get reference asset"));
      return {
        id: String(row.id),
        ownerId: String(row.owner_id),
        packId: String(row.pack_id),
        referenceIndex: Number(row.reference_index),
        storageBucket: String(row.storage_bucket),
        storagePath: String(row.storage_path),
        mimeType: String(row.mime_type),
        expiresAt: String(row.expires_at),
      };
    },
    async listReferenceAssets(ownerId, packId) {
      const result = await product
        .from("character_assets")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("pack_id", packId)
        .eq("asset_kind", "reference")
        .is("deleted_at", null);
      return (requireData(result, "list reference assets") ?? []).map((value: unknown) => {
        const row = asRow(value);
        return {
          id: String(row.id),
          ownerId: String(row.owner_id),
          packId: String(row.pack_id),
          referenceIndex: Number(row.reference_index),
          storageBucket: String(row.storage_bucket),
          storagePath: String(row.storage_path),
          mimeType: String(row.mime_type),
          expiresAt: String(row.expires_at),
        };
      });
    },
    async deleteReferenceAsset(ownerId, assetId) {
      const existing = await product
        .from("character_assets")
        .select("id,owner_id,storage_bucket,storage_path")
        .eq("owner_id", ownerId)
        .eq("id", assetId)
        .eq("asset_kind", "reference")
        .is("deleted_at", null)
        .maybeSingle();
      if (!existing.data) return null;
      const row = asRow(requireData(existing, "get reference asset for deletion"));
      const updated = await product
        .from("character_assets")
        .update({ deleted_at: new Date().toISOString() })
        .eq("owner_id", ownerId)
        .eq("id", assetId)
        .is("deleted_at", null);
      requireData(updated, "delete reference asset");
      return {
        assetId: String(row.id),
        ownerId: String(row.owner_id),
        storageBucket: String(row.storage_bucket),
        storagePath: String(row.storage_path),
      };
    },
    async expireReferenceAssets(beforeIso, limit) {
      const result = await product.rpc("expire_reference_assets", {
        p_before: beforeIso,
        p_limit: limit,
      });
      return (requireData(result, "expire reference assets") ?? []).map((value: unknown) => {
        const row = asRow(value);
        return {
          assetId: String(row.asset_id),
          ownerId: String(row.asset_owner_id),
          storageBucket: String(row.storage_bucket),
          storagePath: String(row.storage_path),
        };
      });
    },
    async saveGeneratedAsset(record) {
      const result = await product
        .from("character_assets")
        .upsert(
          {
            id: record.id,
            owner_id: record.ownerId,
            pack_id: record.packId,
            asset_kind: record.assetKind,
            mood_key: record.moodKey ?? null,
            generation_action_key: record.actionKey,
            storage_bucket: record.storageBucket,
            storage_path: record.storagePath,
            mime_type: record.mimeType,
            moderation: record.moderation,
            provider: record.provider,
            model: record.model,
          },
          { onConflict: "owner_id,generation_action_key", ignoreDuplicates: true },
        )
        .select("*")
        .single();
      if (result.error) {
        const replay = await product
          .from("character_assets")
          .select("*")
          .eq("owner_id", record.ownerId)
          .eq("generation_action_key", record.actionKey)
          .is("deleted_at", null)
          .maybeSingle();
        if (replay.data)
          return mapGeneratedAsset(requireData(replay, "replay generated character asset"));
      }
      requireData(result, "save generated character asset");
      return clone(record);
    },
    async getGeneratedAssetByActionKey(ownerId, actionKey) {
      const result = await product
        .from("character_assets")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("generation_action_key", actionKey)
        .is("deleted_at", null)
        .maybeSingle();
      if (!result.data) return null;
      return mapGeneratedAsset(requireData(result, "get generated character asset by action"));
    },
    async listGeneratedAssets(ownerId, packId) {
      const result = await product
        .from("character_assets")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("pack_id", packId)
        .in("asset_kind", ["base", "mood"])
        .is("deleted_at", null);
      return (requireData(result, "list generated character assets") ?? []).map(mapGeneratedAsset);
    },
    async deleteCharacterPack(ownerId, packId) {
      const result = await product.rpc("delete_character_pack", {
        p_owner_id: ownerId,
        p_pack_id: packId,
      });
      return (requireData(result, "delete character pack") ?? []).map((value: unknown) => {
        const row = asRow(value);
        return {
          assetId: "",
          ownerId,
          storageBucket: String(row.storage_bucket),
          storagePath: String(row.storage_path),
        };
      });
    },
    async claimGenerationAction(input) {
      const result = await product.rpc("claim_character_generation", {
        p_owner_id: input.ownerId,
        p_pack_id: input.packId,
        p_action_key: input.actionKey,
        p_action_kind: input.actionKind,
      });
      const rows = requireData(result, "claim character generation");
      const row = asRow(Array.isArray(rows) ? rows[0] : rows);
      const state = String(row.claim_state);
      if (state === "busy") return { state: "busy" };
      if (state === "claimed") {
        return { state: "claimed", claimToken: String(row.returned_claim_token) };
      }
      if (state === "completed") {
        const assetResult = await product
          .from("character_assets")
          .select("*")
          .eq("owner_id", input.ownerId)
          .eq("id", String(row.returned_asset_id))
          .single();
        return {
          state: "completed",
          asset: mapGeneratedAsset(requireData(assetResult, "load completed generation asset")),
        };
      }
      throw new Error("database returned an invalid generation claim state");
    },
    async completeGenerationAction(input) {
      const result = await product.rpc("complete_character_generation", {
        p_owner_id: input.ownerId,
        p_action_key: input.actionKey,
        p_claim_token: input.claimToken,
        p_asset_id: input.assetId,
      });
      if (requireData(result, "complete character generation") !== true) {
        throw new Error("generation claim is no longer valid");
      }
    },
    async settleCharacterGeneration(input) {
      const asset = input.asset;
      const result = await product.rpc("settle_character_generation", {
        p_owner_id: asset.ownerId,
        p_pack_id: asset.packId,
        p_action_key: asset.actionKey,
        p_claim_token: input.claimToken,
        p_asset_id: asset.id,
        p_asset_kind: asset.assetKind,
        p_mood_key: asset.moodKey ?? null,
        p_storage_bucket: asset.storageBucket,
        p_storage_path: asset.storagePath,
        p_mime_type: asset.mimeType,
        p_moderation: asset.moderation,
        p_provider: asset.provider,
        p_model: asset.model,
        p_wallet_reservation_id: input.walletReservationId,
        p_action_kind: input.actionKind,
        p_amount_power_units: input.amountPowerUnits,
        p_receipt_metadata: input.metadata,
      });
      const rows = requireData(result, "settle character generation");
      return mapGeneratedAsset(Array.isArray(rows) ? rows[0] : rows);
    },
    async failGenerationAction(input) {
      const result = await product.rpc("fail_character_generation", {
        p_owner_id: input.ownerId,
        p_action_key: input.actionKey,
        p_claim_token: input.claimToken,
      });
      requireData(result, "fail character generation");
    },
    async saveStoryRun(record) {
      const result = await product
        .from("story_runs")
        .upsert({
          id: record.id,
          owner_id: record.ownerId,
          client_run_id: record.clientRunId,
          story_id: record.storyId,
          status: record.status,
          character_bindings: record.characterBindings,
        })
        .select("*")
        .single();
      requireData(result, "save story run");
      return clone(record);
    },
    async getStoryRun(ownerId, runId) {
      const result = await product
        .from("story_runs")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("id", runId)
        .maybeSingle();
      if (!result.data) return null;
      const row = asRow(requireData(result, "get story run"));
      return {
        id: String(row.id),
        ownerId: String(row.owner_id),
        clientRunId: String(row.client_run_id),
        storyId: String(row.story_id),
        status: row.status as StoryRunRecord["status"],
        characterBindings: (row.character_bindings ?? {}) as Readonly<Record<string, string>>,
      };
    },
    async saveEndingSession(record) {
      const result = await product
        .from("ai_ending_sessions")
        .upsert({
          id: record.id,
          owner_id: record.ownerId,
          story_run_id: record.storyRunId,
          client_session_id: record.clientSessionId,
          entry_id: record.entryId,
          status: record.status,
          current_version: record.currentVersion,
          current_sequence: record.currentSequence,
          max_segments: record.maxSegments,
          continuity: record.continuity,
          outline: record.outline ?? null,
          outcome_anchor: record.outcomeAnchor ?? null,
        })
        .select("*")
        .single();
      requireData(result, "save ending session");
      return clone(record);
    },
    async getEndingSession(ownerId, sessionId) {
      const result = await product
        .from("ai_ending_sessions")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("id", sessionId)
        .maybeSingle();
      if (!result.data) return null;
      const row = asRow(requireData(result, "get ending session"));
      return {
        id: String(row.id),
        ownerId: String(row.owner_id),
        storyRunId: String(row.story_run_id),
        clientSessionId: String(row.client_session_id),
        entryId: String(row.entry_id),
        status: row.status as EndingSessionRecord["status"],
        currentVersion: Number(row.current_version),
        currentSequence: Number(row.current_sequence),
        maxSegments: Number(row.max_segments),
        continuity: (row.continuity ?? {}) as Readonly<Record<string, unknown>>,
        ...(row.outline ? { outline: row.outline as Readonly<Record<string, unknown>> } : {}),
        ...(row.outcome_anchor ? { outcomeAnchor: String(row.outcome_anchor) } : {}),
      };
    },
    async getEndingSessionByClientId(ownerId, clientSessionId) {
      const result = await product
        .from("ai_ending_sessions")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("client_session_id", clientSessionId)
        .maybeSingle();
      if (!result.data) return null;
      const row = asRow(requireData(result, "get ending session by client id"));
      return {
        id: String(row.id),
        ownerId: String(row.owner_id),
        storyRunId: String(row.story_run_id),
        clientSessionId: String(row.client_session_id),
        entryId: String(row.entry_id),
        status: row.status as EndingSessionRecord["status"],
        currentVersion: Number(row.current_version),
        currentSequence: Number(row.current_sequence),
        maxSegments: Number(row.max_segments),
        continuity: (row.continuity ?? {}) as Readonly<Record<string, unknown>>,
        ...(row.outline ? { outline: row.outline as Readonly<Record<string, unknown>> } : {}),
        ...(row.outcome_anchor ? { outcomeAnchor: String(row.outcome_anchor) } : {}),
      };
    },
    async advanceEndingCheckpoint(input) {
      const result = await product.rpc("advance_ai_ending_checkpoint", {
        p_owner_id: input.ownerId,
        p_session_id: input.sessionId,
        p_expected_version: input.expectedVersion,
        p_action_key: input.actionKey,
        p_player_action: input.playerAction,
        p_segment: input.segment,
        p_choices: input.choices,
        p_continuity: input.continuity,
        p_terminal: input.terminal,
      });
      if (result.error?.code === "40001") throw new EndingVersionConflictError();
      const rows = requireData(result, "advance ending checkpoint");
      const row = asRow(Array.isArray(rows) ? rows[0] : rows);
      return {
        id: String(row.checkpoint_id),
        ownerId: input.ownerId,
        sessionId: input.sessionId,
        sequence: Number(row.checkpoint_sequence),
        sessionVersion: Number(row.checkpoint_session_version),
        actionKey: input.actionKey,
        terminal: Boolean(row.checkpoint_terminal),
        idempotent: Boolean(row.idempotent),
        playerAction: clone(input.playerAction),
        segment: clone(input.segment),
        choices: clone(input.choices),
        continuity: clone(input.continuity),
      };
    },
    async settleEndingCheckpoint(input) {
      const result = await product.rpc("settle_ai_ending_checkpoint", {
        p_owner_id: input.ownerId,
        p_session_id: input.sessionId,
        p_expected_version: input.expectedVersion,
        p_action_key: input.actionKey,
        p_player_action: input.playerAction,
        p_segment: input.segment,
        p_choices: input.choices,
        p_continuity: input.continuity,
        p_terminal: input.terminal,
        p_wallet_reservation_id: input.walletReservationId,
        p_amount_power_units: input.amountPowerUnits,
        p_receipt_metadata: input.metadata,
      });
      if (result.error?.code === "40001") throw new EndingVersionConflictError();
      const rows = requireData(result, "settle ending checkpoint");
      const row = asRow(Array.isArray(rows) ? rows[0] : rows);
      return {
        id: String(row.checkpoint_id),
        ownerId: input.ownerId,
        sessionId: input.sessionId,
        sequence: Number(row.checkpoint_sequence),
        sessionVersion: Number(row.checkpoint_session_version),
        actionKey: input.actionKey,
        terminal: Boolean(row.checkpoint_terminal),
        idempotent: Boolean(row.idempotent),
        playerAction: clone(input.playerAction),
        segment: clone(input.segment),
        choices: clone(input.choices),
        continuity: clone(input.continuity),
      };
    },
    async listEndingCheckpoints(ownerId, sessionId) {
      const result = await product
        .from("ai_ending_checkpoints")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("session_id", sessionId)
        .order("sequence", { ascending: true });
      return (requireData(result, "list ending checkpoints") ?? []).map((value: unknown) => {
        const row = asRow(value);
        return {
          id: String(row.id),
          ownerId: String(row.owner_id),
          sessionId: String(row.session_id),
          sequence: Number(row.sequence),
          sessionVersion: Number(row.session_version),
          actionKey: String(row.action_key),
          terminal: Boolean(row.terminal),
          idempotent: true,
          playerAction: (row.player_action ?? {}) as Readonly<Record<string, unknown>>,
          segment: (row.segment ?? {}) as Readonly<Record<string, unknown>>,
          choices: (row.choices ?? []) as readonly Readonly<Record<string, unknown>>[],
          continuity: (row.continuity ?? {}) as Readonly<Record<string, unknown>>,
        };
      });
    },
    async recordSpendReceipt(input) {
      const result = await product.rpc("record_spend_receipt", {
        p_owner_id: input.ownerId,
        p_wallet_reservation_id: input.walletReservationId,
        p_action_kind: input.actionKind,
        p_scope_type: input.scopeType,
        p_scope_id: input.scopeId ?? null,
        p_amount_power_units: input.amountPowerUnits,
        p_metadata: input.metadata,
      });
      if (result.error?.code === "23505") throw new ReceiptConflictError();
      const rows = requireData(result, "record spend receipt");
      const row = asRow(Array.isArray(rows) ? rows[0] : rows);
      return { ...clone(input), id: String(row.receipt_id), idempotent: Boolean(row.idempotent) };
    },
    async listSpendReceipts(ownerId) {
      const result = await product
        .from("ai_spend_receipts")
        .select("*")
        .eq("owner_id", ownerId)
        .order("committed_at", { ascending: false });
      return (requireData(result, "list spend receipts") ?? []).map((value: unknown) => {
        const row = asRow(value);
        return {
          id: String(row.id),
          ownerId: String(row.owner_id),
          walletReservationId: String(row.wallet_reservation_id),
          actionKind: row.action_kind as SpendReceiptInput["actionKind"],
          scopeType: row.scope_type as SpendReceiptInput["scopeType"],
          ...(row.scope_id ? { scopeId: String(row.scope_id) } : {}),
          amountPowerUnits: Number(row.amount_power_units),
          metadata: (row.metadata ?? {}) as Readonly<Record<string, unknown>>,
          idempotent: true,
        };
      });
    },
  };
}

export type ConfiguredSupaluvStoreOptions = {
  readonly mode: "development" | "test" | "production";
  readonly supabaseUrl?: string;
  readonly serviceRoleKey?: string;
  readonly clientFactory?: typeof createClient;
};

export function createConfiguredSupaluvStore(options: ConfiguredSupaluvStoreOptions): SupaluvStore {
  const url = options.supabaseUrl?.trim();
  const key = options.serviceRoleKey?.trim();
  if (!url || !key) {
    if (options.mode === "production") {
      throw new Error("SupaLuv server database credentials are required in production");
    }
    return createInMemorySupaluvStore();
  }

  const factory = options.clientFactory ?? createClient;
  const client = factory(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return createSupabaseSupaluvStore(client);
}
