import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { resolveStatsPick } from "../../apps/web/src/stats/choiceStatsCatalog";
import {
  buildEchoRows,
  cohortFromPercent,
  mergeCountMaps,
  percentForChoice,
} from "../../apps/web/src/stats/choiceStatsMath";
import {
  getLocalChoiceCounts,
  incrementLocalChoice,
  replaceLocalChoiceCountsForTesting,
} from "../../apps/web/src/stats/choiceStatsLocal";
import { CHOICE_STATS_SEED } from "../../apps/web/src/stats/choiceStatsSeed";
import type { SessionChoicePick } from "../../apps/web/src/stats/choiceStatsTypes";

beforeAll(() => {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      key: (index: number) => [...store.keys()][index] ?? null,
    },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  localStorage.clear();
  replaceLocalChoiceCountsForTesting({});
});

describe("choice stats catalog", () => {
  it("matches draft bones branch labels", () => {
    const accept = resolveStatsPick("draft-ch01", "dch01_s003", "点头：至少说人话了");
    expect(accept?.option.choiceId).toBe("d1_bones_accept");

    const cold = resolveStatsPick("draft-ch01", "dch01_s003", "冷笑：后门也算诚实");
    expect(cold?.option.choiceId).toBe("d1_bones_cold");
  });

  it("ignores continue-only / unlisted scenes", () => {
    expect(resolveStatsPick("draft-ch01", "dch01_s001", "继续")).toBeNull();
  });
});

describe("choice stats math", () => {
  it("merges seed and local counts", () => {
    const merged = mergeCountMaps(CHOICE_STATS_SEED, {
      d1_bones_accept: 10,
    });
    expect(merged.d1_bones_accept).toBe((CHOICE_STATS_SEED.d1_bones_accept ?? 0) + 10);
  });

  it("computes percent and cohort", () => {
    const { percent, total } = percentForChoice(
      {
        d1_bones_accept: 40,
        d1_bones_cold: 60,
      },
      "d1_bones_cold",
      ["d1_bones_accept", "d1_bones_cold"],
      8,
    );
    expect(total).toBe(100);
    expect(percent).toBe(60);
    expect(cohortFromPercent(60).kind).toBe("majority");
    expect(cohortFromPercent(20).kind).toBe("minority");
  });

  it("builds echo rows for session picks", () => {
    const picks: SessionChoicePick[] = [
      {
        decisionId: "d1_bones",
        choiceId: "d1_bones_cold",
        prompt: "协议：字面与骨头",
        shortLabel: "冷笑：后门也算诚实",
        sceneId: "dch01_s003",
      },
    ];
    const rows = buildEchoRows({
      storyId: "draft-ch01",
      picks,
      counts: { d1_bones_accept: 40, d1_bones_cold: 60 },
      sourceNote: "test",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.percentSame).toBeTypeOf("number");
    expect(rows[0]?.yourLabel).toContain("后门");
  });
});

describe("choice stats local store", () => {
  it("increments and reads", () => {
    incrementLocalChoice("d1_bones_accept");
    incrementLocalChoice("d1_bones_accept", 2);
    expect(getLocalChoiceCounts().d1_bones_accept).toBe(3);
  });
});
