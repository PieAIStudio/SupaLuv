/**
 * SwimmerCore wallet metering (service_role only).
 * 100 power units = 1 battery.
 *
 * When SWIMMER_CORE_SECRET_KEY is missing, metering is "open" only if
 * SUPALUV_WALLET_OPTIONAL=1 (local framework); otherwise AI/TTS spend is denied.
 *
 * Credentials: SWIMMER_CORE_SUPABASE_URL + SWIMMER_CORE_SECRET_KEY only
 * (see commercialServerConfig.ts). Browser VITE_* keys and generic service-role
 * aliases do not enable metering.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import {
  commercialServerCredentialsConfigured,
  resolveCommercialServerCredentials,
} from "./commercialServerConfig.js";

const POWER_PER_BATTERY = 100;

export const AI_BRANCH_COST_BATTERIES = Number(process.env.SUPALUV_AI_BRANCH_COST_BATTERIES ?? "1");
export const TTS_COST_BATTERIES = Number(process.env.SUPALUV_TTS_COST_BATTERIES ?? "0");

function appId(): string {
  return (process.env.SUPALUV_SWIMMER_APP_ID ?? "supaluv").trim() || "supaluv";
}

export function walletMeterConfigured(): boolean {
  return commercialServerCredentialsConfigured();
}

export function walletOptionalMode(): boolean {
  return process.env.SUPALUV_WALLET_OPTIONAL === "1";
}

function adminClient(): SupabaseClient | null {
  const creds = resolveCommercialServerCredentials();
  if (!creds) {
    return null;
  }
  return createClient(creds.supabaseUrl, creds.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface WalletBalance {
  readonly batteries: number;
  readonly availablePowerUnits: number;
  readonly reservedPowerUnits: number;
}

export async function getWalletBalance(userId: string): Promise<WalletBalance | null> {
  const sb = adminClient();
  if (!sb) {
    return null;
  }
  const { data, error } = await sb.rpc("wallet_get_balance", {
    p_user_id: userId,
    p_app_id: appId(),
  });
  if (error) {
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    return null;
  }
  const available = Number((row as { available_power_units?: unknown }).available_power_units);
  const reserved = Number((row as { reserved_power_units?: unknown }).reserved_power_units ?? 0);
  if (!Number.isFinite(available)) {
    return null;
  }
  return {
    availablePowerUnits: available,
    reservedPowerUnits: Number.isFinite(reserved) ? reserved : 0,
    batteries: available / POWER_PER_BATTERY,
  };
}

export interface ReserveResult {
  readonly ok: true;
  readonly reservationId: string;
  readonly amountPowerUnits: number;
  readonly skipped: boolean;
}

export interface ReserveFailure {
  readonly ok: false;
  readonly code: "INSUFFICIENT" | "METER_UNAVAILABLE" | "DENIED";
  readonly message: string;
}

/**
 * Reserve batteries before a paid AI action.
 * Cost 0 or optional-mode without secret → skipped (no reservation id).
 */
export async function reserveBatteries(input: {
  readonly userId: string;
  readonly batteries: number;
  readonly reason: string;
  readonly idempotencyKey?: string;
}): Promise<ReserveResult | ReserveFailure> {
  const amount = Math.max(0, Math.round(input.batteries * POWER_PER_BATTERY));
  if (amount <= 0) {
    return { ok: true, reservationId: "", amountPowerUnits: 0, skipped: true };
  }

  if (!walletMeterConfigured()) {
    if (walletOptionalMode()) {
      return { ok: true, reservationId: "", amountPowerUnits: amount, skipped: true };
    }
    return {
      ok: false,
      code: "METER_UNAVAILABLE",
      message: "Wallet metering not configured (need SWIMMER_CORE_SECRET_KEY)",
    };
  }

  const sb = adminClient()!;
  const idem =
    input.idempotencyKey?.trim() || `supaluv:${input.reason}:${input.userId}:${randomUUID()}`;

  const { data, error } = await sb.rpc("wallet_reserve", {
    p_user_id: input.userId,
    p_app_id: appId(),
    p_idempotency_key: idem,
    p_amount_power_units: amount,
    p_metadata: { reason: input.reason, product: "supaluv" },
  });

  if (error) {
    return { ok: false, code: "DENIED", message: error.message.slice(0, 160) };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    return { ok: false, code: "DENIED", message: "wallet_reserve empty response" };
  }
  const rec = row as {
    allowed?: boolean;
    insufficient?: boolean;
    reservation_id?: string;
  };
  if (rec.insufficient || rec.allowed === false) {
    return { ok: false, code: "INSUFFICIENT", message: "INSUFFICIENT_BATTERIES" };
  }
  const reservationId = typeof rec.reservation_id === "string" ? rec.reservation_id : "";
  if (!reservationId) {
    return { ok: false, code: "DENIED", message: "No reservation_id" };
  }
  return { ok: true, reservationId, amountPowerUnits: amount, skipped: false };
}

export async function commitReservation(
  input: {
    readonly reservationId: string;
    readonly reason: string;
  },
  client?: SupabaseClient,
): Promise<void> {
  if (!input.reservationId || !walletMeterConfigured()) {
    return;
  }
  const sb = client ?? adminClient()!;
  const { error } = await sb.rpc("wallet_commit", {
    p_reservation_id: input.reservationId,
    p_app_id: appId(),
    p_idempotency_key: `commit:${input.reservationId}`,
    p_metadata: { reason: input.reason, product: "supaluv" },
  });
  if (error) throw new Error(`wallet commit failed: ${error.message.slice(0, 160)}`);
}

export async function settleReservation(
  input: {
    readonly ownerId: string;
    readonly reservationId: string;
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
  },
  client?: SupabaseClient,
): Promise<void> {
  if (!input.reservationId || input.amountPowerUnits <= 0 || !walletMeterConfigured()) return;
  const sb = (client ?? adminClient()!).schema("supaluv");
  const { error } = await sb.rpc("settle_spend_receipt", {
    p_owner_id: input.ownerId,
    p_wallet_reservation_id: input.reservationId,
    p_action_kind: input.actionKind,
    p_scope_type: input.scopeType,
    p_scope_id: input.scopeId ?? null,
    p_amount_power_units: input.amountPowerUnits,
    p_commit_metadata: { reason: input.actionKind, product: "supaluv" },
    p_receipt_metadata: input.metadata,
  });
  if (error) throw new Error(`wallet settlement failed: ${error.message.slice(0, 160)}`);
}

export async function refundReservation(
  input: {
    readonly reservationId: string;
    readonly reason: string;
  },
  client?: SupabaseClient,
): Promise<void> {
  if (!input.reservationId || !walletMeterConfigured()) {
    return;
  }
  const sb = client ?? adminClient()!;
  const { error } = await sb.rpc("wallet_refund", {
    p_reservation_id: input.reservationId,
    p_app_id: appId(),
    p_idempotency_key: `refund:${input.reservationId}`,
    p_metadata: { reason: input.reason, product: "supaluv" },
  });
  if (error) throw new Error(`wallet refund failed: ${error.message.slice(0, 160)}`);
}
