import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  commercialServerCredentialsConfigured,
  resolveCommercialServerCredentials,
} from "../../services/ai-branch/src/commercialServerConfig";
import {
  commitReservation,
  getWalletBalance,
  refundReservation,
  reserveBatteries,
  settleReservation,
  walletMeterConfigured,
  walletOptionalMode,
} from "../../services/ai-branch/src/wallet/walletMeter";

const rpc =
  vi.fn<
    (
      functionName: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>
  >();
const schema = vi.fn<(name: string) => { rpc: typeof rpc }>(() => ({ rpc }));
const client = {
  rpc,
  schema,
};

const CANONICAL_URL = "https://wallet.invalid";
const CANONICAL_KEY = "test-service-key";
const USER_ID = "11111111-1111-4111-8111-111111111111";
const RESERVATION_ID = "22222222-2222-4222-8222-222222222222";
const REFUND_ENTRY_ID = "33333333-3333-4333-8333-333333333333";

/** Isolate commercial-related env via Vitest stubs (restored by unstubAllEnvs). */
function stubUnconfiguredCommercialEnv(): void {
  vi.stubEnv("SWIMMER_BACKEND_SUPABASE_URL", "");
  vi.stubEnv("SWIMMER_BACKEND_SECRET_KEY", "");
  vi.stubEnv("SWIMMER_CORE_SUPABASE_URL", "");
  vi.stubEnv("SWIMMER_CORE_SECRET_KEY", "");
  vi.stubEnv("VITE_SWIMMER_BACKEND_SUPABASE_URL", "");
  vi.stubEnv("VITE_SWIMMER_BACKEND_PUBLISHABLE_KEY", "");
  vi.stubEnv("VITE_SWIMMER_CORE_SUPABASE_URL", "");
  vi.stubEnv("VITE_SUPABASE_URL", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  vi.stubEnv("SUPALUV_WALLET_OPTIONAL", "");
}

describe("wallet settlement errors", () => {
  beforeEach(() => {
    stubUnconfiguredCommercialEnv();
    vi.stubEnv("SWIMMER_BACKEND_SUPABASE_URL", CANONICAL_URL);
    vi.stubEnv("SWIMMER_BACKEND_SECRET_KEY", CANONICAL_KEY);
    rpc.mockReset();
    schema.mockClear();
    rpc.mockResolvedValue({ data: {}, error: null });
  });

  it("keeps product settlement in the SupaLuv schema", async () => {
    await settleReservation(
      {
        ownerId: "owner-a",
        reservationId: "reservation-1",
        actionKind: "ai_side_choice",
        scopeType: "story_run",
        amountPowerUnits: 100,
        metadata: {},
      },
      client as never,
    );

    expect(schema).toHaveBeenCalledWith("supaluv");
  });

  it("uses the shared public wallet contract for balance", async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          available_power_units: "200",
          balance_power_units: "250",
          reserved_power_units: "50",
        },
      ],
      error: null,
    });

    const balance = await getWalletBalance(USER_ID, client as never);

    expect(schema).toHaveBeenCalledWith("public");
    expect(rpc).toHaveBeenCalledWith("wallet_get_balance", {
      p_app_id: "supaluv",
      p_user_id: USER_ID,
    });
    expect(balance).toEqual({
      availablePowerUnits: 200,
      reservedPowerUnits: 50,
      batteries: 2,
    });
  });

  it("uses the shared public wallet contract for reserve", async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          allowed: true,
          amount_power_units: "100",
          available_power_units: "100",
          balance_power_units: "200",
          idempotent: false,
          insufficient: false,
          reservation_id: RESERVATION_ID,
          reserved_power_units: "100",
          status: "reserved",
        },
      ],
      error: null,
    });

    const reserved = await reserveBatteries(
      {
        userId: USER_ID,
        batteries: 1,
        reason: "ai_branch",
        idempotencyKey: "supaluv:test:reserve",
      },
      client as never,
    );

    expect(schema).toHaveBeenCalledWith("public");
    expect(rpc).toHaveBeenCalledWith(
      "wallet_reserve",
      expect.objectContaining({
        p_app_id: "supaluv",
        p_user_id: USER_ID,
        p_amount_power_units: "100",
        p_idempotency_key: "supaluv:test:reserve",
      }),
    );
    expect(reserved).toEqual({
      ok: true,
      reservationId: RESERVATION_ID,
      amountPowerUnits: 100,
      skipped: false,
    });
  });

  it("rejects malformed wallet responses instead of accepting partial evidence", async () => {
    rpc.mockResolvedValueOnce({
      data: [{ available_power_units: "200" }],
      error: null,
    });

    await expect(getWalletBalance(USER_ID, client as never)).resolves.toBeNull();
  });

  it("uses the shared public wallet contract for commit and refund", async () => {
    rpc
      .mockResolvedValueOnce({
        data: [
          {
            allowed: true,
            amount_power_units: "100",
            available_power_units: "100",
            balance_power_units: "100",
            idempotent: false,
            reservation_id: RESERVATION_ID,
            reserved_power_units: "0",
            status: "committed",
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            allowed: true,
            amount_power_units: "100",
            available_power_units: "200",
            balance_power_units: "200",
            idempotent: false,
            refund_entry_id: REFUND_ENTRY_ID,
            reservation_id: RESERVATION_ID,
            reserved_power_units: "0",
            status: "refunded",
          },
        ],
        error: null,
      });

    await commitReservation({ reservationId: RESERVATION_ID, reason: "test" }, client as never);
    await refundReservation({ reservationId: RESERVATION_ID, reason: "test" }, client as never);

    expect(schema).toHaveBeenNthCalledWith(1, "public");
    expect(schema).toHaveBeenNthCalledWith(2, "public");
    expect(rpc).toHaveBeenNthCalledWith(
      1,
      "wallet_commit",
      expect.objectContaining({ p_reservation_id: RESERVATION_ID }),
    );
    expect(rpc).toHaveBeenNthCalledWith(
      2,
      "wallet_refund",
      expect.objectContaining({ p_reservation_id: RESERVATION_ID }),
    );
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
      rpc.mockResolvedValueOnce({ data: null, error: new Error("database unavailable") });
      const result =
        operation === "commit"
          ? commitReservation({ reservationId: RESERVATION_ID, reason: "test" }, client as never)
          : refundReservation({ reservationId: RESERVATION_ID, reason: "test" }, client as never);
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
      SWIMMER_BACKEND_SUPABASE_URL: `  ${CANONICAL_URL}  `,
      SWIMMER_BACKEND_SECRET_KEY: `  ${CANONICAL_KEY}  `,
    });
    expect(resolved).toEqual({
      supabaseUrl: CANONICAL_URL,
      serviceRoleKey: CANONICAL_KEY,
    });
  });

  it("requires both canonical values", () => {
    expect(
      resolveCommercialServerCredentials({
        SWIMMER_BACKEND_SUPABASE_URL: CANONICAL_URL,
      }),
    ).toBeNull();
    expect(
      resolveCommercialServerCredentials({
        SWIMMER_BACKEND_SECRET_KEY: CANONICAL_KEY,
      }),
    ).toBeNull();
    expect(
      resolveCommercialServerCredentials({
        SWIMMER_BACKEND_SUPABASE_URL: "   ",
        SWIMMER_BACKEND_SECRET_KEY: CANONICAL_KEY,
      }),
    ).toBeNull();
    expect(commercialServerCredentialsConfigured({})).toBe(false);
  });

  it("does not enable wallet metering from VITE or generic aliases alone", () => {
    stubUnconfiguredCommercialEnv();
    vi.stubEnv("VITE_SWIMMER_BACKEND_SUPABASE_URL", CANONICAL_URL);
    vi.stubEnv("VITE_SUPABASE_URL", CANONICAL_URL);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", CANONICAL_KEY);

    expect(walletMeterConfigured()).toBe(false);
    expect(resolveCommercialServerCredentials()).toBeNull();
  });

  it("enables metering only when both canonical server variables are set", () => {
    stubUnconfiguredCommercialEnv();
    vi.stubEnv("SWIMMER_BACKEND_SUPABASE_URL", ` ${CANONICAL_URL} `);
    vi.stubEnv("SWIMMER_BACKEND_SECRET_KEY", ` ${CANONICAL_KEY} `);

    expect(walletMeterConfigured()).toBe(true);
    expect(commercialServerCredentialsConfigured()).toBe(true);
  });

  it("prefers canonical server variables over the former SwimmerCore aliases", () => {
    const resolved = resolveCommercialServerCredentials({
      SWIMMER_BACKEND_SECRET_KEY: "backend-secret",
      SWIMMER_BACKEND_SUPABASE_URL: "https://backend.invalid",
      SWIMMER_CORE_SECRET_KEY: "legacy-secret",
      SWIMMER_CORE_SUPABASE_URL: "https://legacy.invalid",
    });

    expect(resolved).toEqual({
      supabaseUrl: "https://backend.invalid",
      serviceRoleKey: "backend-secret",
    });
  });

  it("keeps the former SwimmerCore server variables as a temporary fallback", () => {
    stubUnconfiguredCommercialEnv();
    vi.stubEnv("SWIMMER_CORE_SUPABASE_URL", CANONICAL_URL);
    vi.stubEnv("SWIMMER_CORE_SECRET_KEY", CANONICAL_KEY);

    expect(walletMeterConfigured()).toBe(true);
    expect(resolveCommercialServerCredentials()).toEqual({
      supabaseUrl: CANONICAL_URL,
      serviceRoleKey: CANONICAL_KEY,
    });
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
