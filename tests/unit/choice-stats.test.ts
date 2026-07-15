import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  PRODUCTION_CHOICE_STATS_CATALOG,
  isPermittedChoiceOnStory,
} from "@supaluv/shared/choice-stats-catalog";
import {
  CHOICE_STATS_CATALOG,
  resolveStatsPick,
} from "../../apps/web/src/stats/choiceStatsCatalog";
import { choiceStatsSourceNote } from "../../apps/web/src/stats/choiceStatsClient";
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

  it("derives presentation catalog IDs from the shared production contract", () => {
    const productionKeys = new Set(
      PRODUCTION_CHOICE_STATS_CATALOG.flatMap((decision) =>
        decision.choiceIds.map(
          (choiceId) => `${decision.storyId}:${decision.decisionId}:${choiceId}`,
        ),
      ),
    );
    const browserKeys = new Set(
      CHOICE_STATS_CATALOG.flatMap((decision) =>
        decision.options.map(
          (option) => `${decision.storyId}:${decision.decisionId}:${option.choiceId}`,
        ),
      ),
    );
    expect(browserKeys).toEqual(productionKeys);

    for (const decision of CHOICE_STATS_CATALOG) {
      for (const option of decision.options) {
        expect(isPermittedChoiceOnStory(decision.storyId, option.choiceId)).toBe(true);
      }
    }

    for (const [choiceId] of Object.entries(CHOICE_STATS_SEED)) {
      const permittedSomewhere = CHOICE_STATS_CATALOG.some((decision) =>
        decision.options.some((option) => option.choiceId === choiceId),
      );
      expect(permittedSomewhere).toBe(true);
    }
  });
});

describe("choice stats math", () => {
  it("labels offline and process-memory sources as local samples, never global people", () => {
    const offline = choiceStatsSourceNote(null);
    expect(offline).toContain("本地样本");
    expect(offline).toContain("非全球人数");
    expect(offline).not.toContain("社区真相");
    // Must negate population claims; bare "全球人数" without 非 is disallowed.
    expect(offline.includes("全球人数") && !offline.includes("非全球人数")).toBe(false);

    const processMemory = choiceStatsSourceNote("anonymous-memory-aggregate");
    expect(processMemory).toContain("本地演示样本");
    expect(processMemory).toContain("非社区");
    expect(processMemory).toContain("非社区/全球人数");
    expect(processMemory).not.toContain("在线匿名聚合");
    expect(processMemory).not.toContain("社区真相");
  });

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
