import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadAuthoritativeCounts,
  majorityOptionForDecision,
  preferCommunityChoiceIndex,
} from "../../apps/web/src/stats/choiceStatsLean";
import {
  clearOracleGuesses,
  scoreOracleVerdicts,
  setOracleGuess,
} from "../../apps/web/src/stats/oracleMemory";
import { preferredTransportKind } from "../../apps/web/src/coplay/createCoPlayTransport";
import { resetChoiceStatsRemoteForTesting } from "../../apps/web/src/stats/choiceStatsRemote";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resetChoiceStatsRemoteForTesting();
  clearOracleGuesses();
});

describe("choice lean + oracle", () => {
  it("pure majority math still prefers higher percent when given counts", () => {
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
    expect(pick?.note).toContain("样本多数");
    expect(pick?.note).not.toContain("全球");
  });

  it("scores oracle guesses only against provided majority map", () => {
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

  it("keeps Oracle majority deterministic and unavailable for thin or tied samples", () => {
    expect(majorityOptionForDecision("draft-ch01", "d1_bones", {})).toBeNull();
    expect(
      majorityOptionForDecision("draft-ch01", "d1_bones", {
        d1_bones_accept: 10,
        d1_bones_cold: 10,
      }),
    ).toBeNull();

    const majority = majorityOptionForDecision("draft-ch01", "d1_bones", {
      d1_bones_accept: 30,
      d1_bones_cold: 70,
    });
    expect(majority).toMatchObject({ choiceId: "d1_bones_cold", percent: 70 });

    clearOracleGuesses();
    setOracleGuess({
      decisionId: "d1_bones",
      predictedChoiceId: "d1_bones_cold",
      predictedLabel: "冷笑：后门也算诚实",
      sceneId: "dch01_s003",
    });
    const verdicts = scoreOracleVerdicts(
      new Map(majority ? [["d1_bones", majority] as const] : []),
    );
    expect(verdicts[0]?.correct).toBe(true);
    clearOracleGuesses();
  });

  it("process-memory aggregate cannot authorize Oracle majority loading", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            storyId: "draft-ch01",
            counts: { d1_bones_accept: 20, d1_bones_cold: 80 },
            source: "anonymous-memory-aggregate",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const counts = await loadAuthoritativeCounts("draft-ch01");
    expect(counts).toEqual({});
    expect(majorityOptionForDecision("draft-ch01", "d1_bones", counts)).toBeNull();

    clearOracleGuesses();
    setOracleGuess({
      decisionId: "d1_bones",
      predictedChoiceId: "d1_bones_cold",
      predictedLabel: "冷笑：后门也算诚实",
      sceneId: "dch01_s003",
    });
    const majorityMap = new Map<string, { choiceId: string; shortLabel: string }>();
    for (const guess of [{ decisionId: "d1_bones" }]) {
      const maj = majorityOptionForDecision("draft-ch01", guess.decisionId, counts);
      if (maj) {
        majorityMap.set(guess.decisionId, {
          choiceId: maj.choiceId,
          shortLabel: maj.shortLabel,
        });
      }
    }
    expect(scoreOracleVerdicts(majorityMap)).toEqual([]);
  });

  it("defaults transport to broadcast without supabase env", () => {
    expect(preferredTransportKind()).toBe("broadcast");
  });
});
