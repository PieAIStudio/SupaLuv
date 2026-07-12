import { describe, expect, it } from "vitest";
import { preferCommunityChoiceIndex } from "../../apps/web/src/stats/choiceStatsLean";
import {
  clearOracleGuesses,
  scoreOracleVerdicts,
  setOracleGuess,
} from "../../apps/web/src/stats/oracleMemory";
import { preferredTransportKind } from "../../apps/web/src/coplay/createCoPlayTransport";

describe("choice lean + oracle", () => {
  it("prefers higher community percent", () => {
    const pick = preferCommunityChoiceIndex({
      storyId: "draft-ch01",
      sceneId: "dch01_s003",
      hostLabel: "点头：至少说人话了",
      guestLabel: "冷笑：后门也算诚实",
      hostIndex: 0,
      guestIndex: 1,
      counts: {
        d1_bones_accept: 80,
        d1_bones_cold: 20,
      },
    });
    expect(pick?.index).toBe(0);
    expect(pick?.note).toContain("全球回声");
  });

  it("scores oracle guesses", () => {
    clearOracleGuesses();
    setOracleGuess({
      decisionId: "d1",
      predictedChoiceId: "a",
      predictedLabel: "A",
      sceneId: "s1",
    });
    const verdicts = scoreOracleVerdicts(
      new Map([
        ["d1", { choiceId: "a", shortLabel: "A" }],
        ["d2", { choiceId: "b", shortLabel: "B" }],
      ]),
    );
    expect(verdicts).toHaveLength(1);
    expect(verdicts[0]?.correct).toBe(true);
    clearOracleGuesses();
  });

  it("defaults transport to broadcast without supabase env", () => {
    expect(preferredTransportKind()).toBe("broadcast");
  });
});
