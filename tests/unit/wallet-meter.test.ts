import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  commitReservation,
  refundReservation,
  settleReservation,
} from "../../services/ai-branch/src/walletMeter";

const rpc = vi.fn();
const client = {
  rpc,
  schema: () => ({ rpc }),
};

describe("wallet settlement errors", () => {
  beforeEach(() => {
    process.env.SWIMMER_CORE_SUPABASE_URL = "https://wallet.invalid";
    process.env.SWIMMER_CORE_SECRET_KEY = "test-service-key";
    rpc.mockReset();
    rpc.mockResolvedValue({ data: {}, error: null });
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
