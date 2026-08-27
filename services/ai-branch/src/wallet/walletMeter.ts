/**
 * SwimmerBackend wallet metering (service_role only).
 * 100 power units = 1 battery.
 *
 * When SWIMMER_BACKEND_SECRET_KEY is missing, metering is "open" only if
 * SUPALUV_WALLET_OPTIONAL=1 (local framework); otherwise AI/TTS spend is denied.
 *
 * Credentials: SWIMMER_BACKEND_SUPABASE_URL + SWIMMER_BACKEND_SECRET_KEY
 * (see commercialServerConfig.ts). Browser VITE_* keys and generic service-role
 * aliases do not enable metering.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createWalletClient } from "@pieai/swimmer-backend-client/wallet";
import { randomUUID } from "node:crypto";
import {
  commercialServerCredentialsConfigured,
  resolveCommercialServerCredentials,
} from "../commercialServerConfig.js";

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

function walletClient(client?: SupabaseClient) {
  const provider = client ?? adminClient();
  if (!provider) {
    return null;
  }
  return createWalletClient(provider.schema("public"), appId());
}

function safePowerUnits(value: string): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export interface WalletBalance {
  readonly batteries: number;
  readonly availablePowerUnits: number;
  readonly reservedPowerUnits: number;
}

export async function getWalletBalance(
  userId: string,
  client?: SupabaseClient,
): Promise<WalletBalance | null> {
  const wallet = walletClient(client);
  if (!wallet) {
    return null;
  }
  try {
    const balance = await wallet.getBalance(userId);
    const available = safePowerUnits(balance.availablePowerUnits);
    const reserved = safePowerUnits(balance.reservedPowerUnits);
    if (available === null || reserved === null) {
      return null;
    }
    return {
      availablePowerUnits: available,
      reservedPowerUnits: reserved,
      batteries: available / POWER_PER_BATTERY,
    };
  } catch {
    return null;
  }
}

/**
 * One-time signup grant so fresh accounts can actually taste the AI hook.
 * Off unless SUPALUV_SIGNUP_GRANT_BATTERIES > 0 (owner enables via env; the
 * amount is a product decision, not a code default). Safe to call on every
 * balance read: the per-user idempotency key makes the ledger write once-only.
 */
export function signupGrantBatteries(): number {
  const parsed = Number(process.env.SUPALUV_SIGNUP_GRANT_BATTERIES ?? "0");
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
}

export async function maybeGrantSignupBatteries(
  userId: string,
  client?: SupabaseClient,
): Promise<boolean> {
  const batteries = signupGrantBatteries();
  if (batteries <= 0) {
    return false;
  }
  const wallet = walletClient(client);
  if (!wallet) {
    return false;
  }
  try {
    await wallet.grant({
      amountPowerUnits: String(batteries * POWER_PER_BATTERY),
      idempotencyKey: `signup_grant:v1:${userId}`,
      kind: "earn",
      metadata: { reason: "signup_grant", batteries },
      userId,
    });
    return true;
  } catch {
    return false;
  }
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
export async function reserveBatteries(
  input: {
    readonly userId: string;
    readonly batteries: number;
    readonly reason: string;
    readonly idempotencyKey?: string;
  },
  client?: SupabaseClient,
): Promise<ReserveResult | ReserveFailure> {
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
      message: "Wallet metering not configured (need SWIMMER_BACKEND_SECRET_KEY)",
    };
  }

  const idem =
    input.idempotencyKey?.trim() || `supaluv:${input.reason}:${input.userId}:${randomUUID()}`;

  try {
    const reservation = await walletClient(client)!.reserve({
      userId: input.userId,
      idempotencyKey: idem,
      amountPowerUnits: String(amount),
      metadata: { reason: input.reason, product: "supaluv" },
    });
    if (reservation.insufficient || !reservation.allowed) {
      return { ok: false, code: "INSUFFICIENT", message: "INSUFFICIENT_BATTERIES" };
    }
    if (!reservation.reservationId) {
      return { ok: false, code: "DENIED", message: "No reservation_id" };
    }
    return {
      ok: true,
      reservationId: reservation.reservationId,
      amountPowerUnits: amount,
      skipped: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Wallet reservation denied";
    return { ok: false, code: "DENIED", message: message.slice(0, 160) };
  }
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
  try {
    await walletClient(client)!.commit({
      reservationId: input.reservationId,
      idempotencyKey: `commit:${input.reservationId}`,
      metadata: { reason: input.reason, product: "supaluv" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown wallet error";
    throw new Error(`wallet commit failed: ${message.slice(0, 160)}`);
  }
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
  try {
    await walletClient(client)!.refund({
      reservationId: input.reservationId,
      idempotencyKey: `refund:${input.reservationId}`,
      metadata: { reason: input.reason, product: "supaluv" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown wallet error";
    throw new Error(`wallet refund failed: ${message.slice(0, 160)}`);
  }
}
