import { describe, expect, it } from "vitest";
import { buildRpsView, type RpsDuelState } from "../../apps/web/src/coplay/rpsViewModel";

const baseOpen = {
  version: 1 as const,
  kind: "rps_open" as const,
  duelId: "d1",
  sceneId: "s1",
  hostChoiceIndex: 0,
  hostChoiceText: "A",
  guestChoiceIndex: 1,
  guestChoiceText: "B",
  guestPlayerId: "g1",
  updatedAtMs: 1,
};

describe("buildRpsView", () => {
  it("returns null without duel", () => {
    expect(buildRpsView(null, "host")).toBeNull();
  });

  it("maps remote throw for host as guestThrow", () => {
    const duel: RpsDuelState = {
      open: baseOpen,
      localThrow: "rock",
      hostThrow: "rock",
      guestThrow: null,
      result: null,
      globalNote: null,
    };
    const view = buildRpsView(duel, "host");
    expect(view?.waitingRemote).toBe(true);
    expect(view?.remoteThrow).toBeNull();
    expect(view?.localThrow).toBe("rock");
  });
});
