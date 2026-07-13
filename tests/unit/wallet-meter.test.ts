import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  commercialServerCredentialsConfigured,
  resolveCommercialServerCredentials,
} from "../../services/ai-branch/src/commercialServerConfig";
import {
  commitReservation,
  refundReservation,
  reserveBatteries,
  settleReservation,
  walletMeterConfigured,
  walletOptionalMode,
} from "../../services/ai-branch/src/walletMeter";

const rpc = vi.fn();
const client = {
  rpc,
  schema: () => ({ rpc }),
};

const CANONICAL_URL = "https://wallet.invalid";
const CANONICAL_KEY = "test-service-key";

/** Isolate commercial-related env via Vitest stubs (restored by unstubAllEnvs). */
function stubUnconfiguredCommercialEnv(): void {
  vi.stubEnv("SWIMMER_CORE_SUPABASE_URL", "");
  vi.stubEnv("SWIMMER_CORE_SECRET_KEY", "");
  vi.stubEnv("VITE_SWIMMER_CORE_SUPABASE_URL", "");
  vi.stubEnv("VITE_SUPABASE_URL", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  vi.stubEnv("SUPALUV_WALLET_OPTIONAL", "");
}

describe("wallet settlement errors", () => {
  beforeEach(() => {
    stubUnconfiguredCommercialEnv();
    vi.stubEnv("SWIMMER_CORE_SUPABASE_URL", CANONICAL_URL);
    vi.stubEnv("SWIMMER_CORE_SECRET_KEY", CANONICAL_KEY);
    rpc.mockReset();
    rpc.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the atomic SupaLuv settlement RPC for billed AI actions", async () => {
    await settleReservation(
      {
        ownerId: "owner-a",
        reservationId: "reservation-1",
        actionKind: "ai_side_choice",
        scopeType: "story_run",
        amountPowerUnits: 100,
        metadata: { storyId: "ch01" },
      },
      client as never,
    );

    expect(rpc).toHaveBeenCalledWith(
      "settle_spend_receipt",
      expect.objectContaining({
        p_owner_id: "owner-a",
        p_wallet_reservation_id: "reservation-1",
        p_action_kind: "ai_side_choice",
        p_amount_power_units: 100,
      }),
    );
  });

  it.each(["commit", "refund"] as const)(
    "does not silently swallow a wallet %s failure",
    async (operation) => {
      rpc.mockResolvedValueOnce({ data: null, error: { message: "database unavailable" } });
      const result =
        operation === "commit"
          ? commitReservation({ reservationId: "reservation-1", reason: "test" }, client as never)
          : refundReservation({ reservationId: "reservation-1", reason: "test" }, client as never);
      await expect(result).rejects.toThrow(/database unavailable/);
    },
  );
});

describe("commercial server credential resolver", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("trims whitespace from canonical URL and secret key", () => {
    const resolved = resolveCommercialServerCredentials({
      SWIMMER_CORE_SUPABASE_URL: `  ${CANONICAL_URL}  `,
      SWIMMER_CORE_SECRET_KEY: `  ${CANONICAL_KEY}  `,
    });
    expect(resolved).toEqual({
      supabaseUrl: CANONICAL_URL,
      serviceRoleKey: CANONICAL_KEY,
    });
  });

  it("requires both canonical values", () => {
    expect(
      resolveCommercialServerCredentials({
        SWIMMER_CORE_SUPABASE_URL: CANONICAL_URL,
      }),
    ).toBeNull();
    expect(
      resolveCommercialServerCredentials({
        SWIMMER_CORE_SECRET_KEY: CANONICAL_KEY,
      }),
    ).toBeNull();
    expect(
      resolveCommercialServerCredentials({
        SWIMMER_CORE_SUPABASE_URL: "   ",
        SWIMMER_CORE_SECRET_KEY: CANONICAL_KEY,
      }),
    ).toBeNull();
    expect(commercialServerCredentialsConfigured({})).toBe(false);
  });

  it("does not enable wallet metering from VITE or generic aliases alone", () => {
    stubUnconfiguredCommercialEnv();
    vi.stubEnv("VITE_SWIMMER_CORE_SUPABASE_URL", CANONICAL_URL);
    vi.stubEnv("VITE_SUPABASE_URL", CANONICAL_URL);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", CANONICAL_KEY);

    expect(walletMeterConfigured()).toBe(false);
    expect(resolveCommercialServerCredentials()).toBeNull();
  });

  it("enables metering only when both canonical server variables are set", () => {
    stubUnconfiguredCommercialEnv();
    vi.stubEnv("SWIMMER_CORE_SUPABASE_URL", ` ${CANONICAL_URL} `);
    vi.stubEnv("SWIMMER_CORE_SECRET_KEY", ` ${CANONICAL_KEY} `);

    expect(walletMeterConfigured()).toBe(true);
    expect(commercialServerCredentialsConfigured()).toBe(true);
  });

  it("keeps optional-wallet skip behavior when metering is unconfigured", async () => {
    stubUnconfiguredCommercialEnv();
    vi.stubEnv("SUPALUV_WALLET_OPTIONAL", "1");

    expect(walletMeterConfigured()).toBe(false);
    expect(walletOptionalMode()).toBe(true);

    const reserved = await reserveBatteries({
      userId: "owner-a",
      batteries: 1,
      reason: "ai_branch",
    });
    expect(reserved).toEqual({
      ok: true,
      reservationId: "",
      amountPowerUnits: 100,
      skipped: true,
    });
  });

  it("denies paid reserve when metering is unconfigured and optional mode is off", async () => {
    stubUnconfiguredCommercialEnv();
    vi.stubEnv("SUPALUV_WALLET_OPTIONAL", "");

    expect(walletOptionalMode()).toBe(false);
    const reserved = await reserveBatteries({
      userId: "owner-a",
      batteries: 1,
      reason: "ai_branch",
    });
    expect(reserved).toMatchObject({
      ok: false,
      code: "METER_UNAVAILABLE",
    });
  });
});
