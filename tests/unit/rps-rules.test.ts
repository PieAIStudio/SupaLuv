import { describe, expect, it } from "vitest";
import {
  resolveRps,
  shouldOpenRpsDuel,
  winningChoiceIndex,
} from "../../apps/web/src/coplay/rpsRules";

describe("rpsRules", () => {
  it("resolves classic matchups", () => {
    expect(resolveRps("rock", "scissors")).toBe("host");
    expect(resolveRps("scissors", "rock")).toBe("guest");
    expect(resolveRps("paper", "rock")).toBe("host");
    expect(resolveRps("rock", "rock")).toBe("draw");
  });

  it("maps winner to choice index", () => {
    expect(winningChoiceIndex({ winner: "host", hostChoiceIndex: 0, guestChoiceIndex: 1 })).toBe(0);
    expect(winningChoiceIndex({ winner: "guest", hostChoiceIndex: 0, guestChoiceIndex: 1 })).toBe(
      1,
    );
    expect(
      winningChoiceIndex({ winner: "draw", hostChoiceIndex: 0, guestChoiceIndex: 1 }),
    ).toBeNull();
  });

  it("opens duel only when guest differs and multi-choice", () => {
    expect(
      shouldOpenRpsDuel({
        hostChoiceIndex: 0,
        guestVotes: [{ choiceIndex: 1 }],
        choiceCount: 2,
      }),
    ).toBe(true);
    expect(
      shouldOpenRpsDuel({
        hostChoiceIndex: 0,
        guestVotes: [{ choiceIndex: 0 }],
        choiceCount: 2,
      }),
    ).toBe(false);
    expect(
      shouldOpenRpsDuel({
        hostChoiceIndex: 0,
        guestVotes: [{ choiceIndex: 1 }],
        choiceCount: 1,
      }),
    ).toBe(false);
  });
});
