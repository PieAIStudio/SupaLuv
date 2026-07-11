import {
  EndingVersionConflictError,
  ReceiptConflictError,
  createConfiguredSupaluvStore,
  createInMemorySupaluvStore,
  createSupabaseSupaluvStore,
} from "../../services/ai-branch/src/supaluvStore";
import { describe, expect, it, vi } from "vitest";

describe("SupaluvStore", () => {
  it("never returns another owner's character pack", async () => {
    const store = createInMemorySupaluvStore();
    await store.saveCharacterPack({
      id: "pack-1",
      ownerId: "owner-a",
      clientPackId: "client-pack-1",
      slotId: "lead_suming",
      status: "draft",
      brief: {},
    });

    await expect(store.getCharacterPack("owner-a", "pack-1")).resolves.toMatchObject({
      id: "pack-1",
    });
    await expect(store.getCharacterPack("owner-b", "pack-1")).resolves.toBeNull();
  });

  it("advances an ending once, replays the same action, and rejects a stale new action", async () => {
    const store = createInMemorySupaluvStore();
    await store.saveEndingSession({
      id: "session-1",
      ownerId: "owner-a",
      storyRunId: "run-1",
      clientSessionId: "client-session-1",
      entryId: "final-choice",
      status: "active",
      currentVersion: 0,
      currentSequence: 0,
      maxSegments: 8,
      continuity: {},
    });

    const input = {
      ownerId: "owner-a",
      sessionId: "session-1",
      expectedVersion: 0,
      actionKey: "action-1",
      playerAction: { kind: "choice", choiceId: "stay" },
      segment: { text: "First segment" },
      choices: [
        { id: "stay", label: "Stay" },
        { id: "leave", label: "Leave" },
      ],
      continuity: { facts: ["truth"] },
      terminal: false,
    } as const;

    const first = await store.advanceEndingCheckpoint(input);
    const replay = await store.advanceEndingCheckpoint(input);

    expect(first).toMatchObject({ sequence: 1, sessionVersion: 1, idempotent: false });
    expect(replay).toMatchObject({ id: first.id, idempotent: true });
    await expect(
      store.advanceEndingCheckpoint({ ...input, actionKey: "action-2" }),
    ).rejects.toBeInstanceOf(EndingVersionConflictError);
  });

  it("stores one receipt per wallet reservation and rejects conflicting reuse", async () => {
    const store = createInMemorySupaluvStore();
    const input = {
      ownerId: "owner-a",
      walletReservationId: "reservation-1",
      actionKind: "character_base",
      scopeType: "character_pack",
      scopeId: "pack-1",
      amountPowerUnits: 100,
      metadata: { slotId: "lead_suming" },
    } as const;

    const first = await store.recordSpendReceipt(input);
    const replay = await store.recordSpendReceipt(input);

    expect(first.idempotent).toBe(false);
    expect(replay).toEqual({ ...first, idempotent: true });
    await expect(
      store.recordSpendReceipt({ ...input, actionKind: "character_regeneration" }),
    ).rejects.toBeInstanceOf(ReceiptConflictError);
  });

  it("fails closed in production when server credentials are absent", () => {
    const clientFactory = vi.fn();

    expect(() =>
      createConfiguredSupaluvStore({
        mode: "production",
        supabaseUrl: "",
        serviceRoleKey: "",
        clientFactory,
      }),
    ).toThrow(/credentials/i);
    expect(clientFactory).not.toHaveBeenCalled();
  });

  it("pins the remote adapter to the SupaLuv product schema", () => {
    const schema = vi.fn(() => ({}));
    const client = { schema } as unknown as Parameters<typeof createSupabaseSupaluvStore>[0];

    createSupabaseSupaluvStore(client);

    expect(schema).toHaveBeenCalledOnce();
    expect(schema).toHaveBeenCalledWith("supaluv");
  });
});
