import type { CharacterPackRecord, GeneratedAssetRecord, SpendReceiptInput } from "./types.js";

export function clone<T>(value: T): T {
  return structuredClone(value);
}

export function sameReceipt(left: SpendReceiptInput, right: SpendReceiptInput): boolean {
  return (
    left.ownerId === right.ownerId &&
    left.actionKind === right.actionKind &&
    left.scopeType === right.scopeType &&
    left.scopeId === right.scopeId &&
    left.amountPowerUnits === right.amountPowerUnits
  );
}

export type DatabaseError = { readonly message: string; readonly code?: string };
export type DatabaseResult<T> = { readonly data: T; readonly error: DatabaseError | null };

export function requireData<T>(result: DatabaseResult<T>, operation: string): T {
  if (result.error) throw new Error(`${operation}: ${result.error.message}`);
  return result.data;
}

export function asRow(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("database returned an invalid row");
  }
  return value as Record<string, unknown>;
}

export function mapPack(value: unknown): CharacterPackRecord {
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

export function mapGeneratedAsset(value: unknown): GeneratedAssetRecord {
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
