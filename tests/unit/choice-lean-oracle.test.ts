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
      storyId: "ch01",
      sceneId: "ch01_office_delete_or_shot",
      hostLabel: "立刻删掉，假装什么都没发生",
      guestLabel: "先截图备份，文件夹叫 not_for_review",
      hostIndex: 0,
      guestIndex: 1,
      counts: {
        "ch01_delete_or_shot.delete": 80,
        "ch01_delete_or_shot.screenshot": 20,
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
