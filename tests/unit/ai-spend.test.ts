import { describe, expect, it } from "vitest";
import { groupSpendReceipts } from "../../services/ai-branch/src/wallet/spendRoutes";

const receipts = [
  {
    id: "receipt-character",
    ownerId: "owner-a",
    walletReservationId: "reservation-character",
    actionKind: "character_base",
    scopeType: "character_pack",
    scopeId: "pack-1",
    amountPowerUnits: 120,
    metadata: { slotId: "lead_suming" },
  },
  {
    id: "receipt-branch",
    ownerId: "owner-a",
    walletReservationId: "reservation-branch",
    actionKind: "ai_side_choice",
    scopeType: "story_run",
    scopeId: "run-1",
    amountPowerUnits: 30,
    metadata: { sceneId: "ch01-demo" },
  },
  {
    id: "receipt-ending",
    ownerId: "owner-a",
    walletReservationId: "reservation-ending",
    actionKind: "ai_ending_segment",
    scopeType: "ai_ending_session",
    scopeId: "ending-1",
    amountPowerUnits: 80,
    metadata: { sequence: 1 },
  },
] as const;

describe("AI spend analysis", () => {
  it("labels committed actions and reports exact battery totals", () => {
    const result = groupSpendReceipts(receipts);

    expect(result.totalPowerUnits).toBe(230);
    expect(result.totalBatteries).toBe(2.3);
    expect(result.items.map((item) => item.label)).toEqual([
      "生成角色基准形象",
      "生成 AI 剧情选项",
      "推进 AI 最终章",
    ]);
  });

  it("groups spend by pack, story run, and ending session", () => {
    const result = groupSpendReceipts(receipts);

    expect(result.groups).toEqual([
      expect.objectContaining({ key: "character_pack:pack-1", totalPowerUnits: 120 }),
      expect.objectContaining({ key: "story_run:run-1", totalPowerUnits: 30 }),
      expect.objectContaining({ key: "ai_ending_session:ending-1", totalPowerUnits: 80 }),
    ]);
  });

  it("deduplicates replayed committed receipts by receipt id", () => {
    const result = groupSpendReceipts([...receipts, receipts[2]]);

    expect(result.items).toHaveLength(3);
    expect(result.totalPowerUnits).toBe(230);
  });
});
