import type { SupabaseClient } from "@supabase/supabase-js";
import type { CharacterGenerationStore } from "./characterGenerationStore.js";
import type { EndingSessionStore } from "./endingSessionStore.js";
import { EndingVersionConflictError } from "./errors.js";
import type { SpendReceiptReader } from "./spendReceipts.js";
import { asRow, clone, mapGeneratedAsset, mapPack, requireData } from "./shared.js";
import type {
  EndingSessionRecord,
  ReferenceAssetRecord,
  SpendReceiptInput,
  StoryRunRecord,
} from "./types.js";

export type SupabasePersistenceModules = {
  readonly characterGeneration: CharacterGenerationStore;
  readonly endingSession: EndingSessionStore;
  readonly spendReceipts: SpendReceiptReader;
};

function createSpendReceiptReader(
  product: ReturnType<SupabaseClient["schema"]>,
): SpendReceiptReader {
  return {
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

function createCharacterGenerationStore(
  product: ReturnType<SupabaseClient["schema"]>,
): CharacterGenerationStore {
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
      } satisfies ReferenceAssetRecord;
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
        } satisfies ReferenceAssetRecord;
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
  };
}

function createEndingSessionStore(
  product: ReturnType<SupabaseClient["schema"]>,
): EndingSessionStore {
  return {
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
  };
}

export function createSupabasePersistenceModules(
  client: SupabaseClient,
): SupabasePersistenceModules {
  const product = client.schema("supaluv");
  return {
    characterGeneration: createCharacterGenerationStore(product),
    endingSession: createEndingSessionStore(product),
    spendReceipts: createSpendReceiptReader(product),
  };
}
