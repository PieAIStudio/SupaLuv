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
  it("matches delete vs screenshot labels", () => {
    const del = resolveStatsPick(
      "ch01",
      "ch01_office_delete_or_shot",
      "立刻删掉，假装什么都没发生",
    );
    expect(del?.option.choiceId).toBe("ch01_delete_or_shot.delete");

    const shot = resolveStatsPick(
      "ch01",
      "ch01_office_delete_or_shot",
      "先截图备份，文件夹叫 not_for_review",
    );
    expect(shot?.option.choiceId).toBe("ch01_delete_or_shot.screenshot");
  });

  it("ignores continue-only / unlisted scenes", () => {
    expect(resolveStatsPick("ch01", "ch01_after_delete", "继续")).toBeNull();
  });
});

describe("choice stats math", () => {
  it("merges seed and local counts", () => {
    const merged = mergeCountMaps(CHOICE_STATS_SEED, {
      "ch01_delete_or_shot.delete": 10,
    });
    expect(merged["ch01_delete_or_shot.delete"]).toBe(
      (CHOICE_STATS_SEED["ch01_delete_or_shot.delete"] ?? 0) + 10,
    );
  });

  it("computes percent and cohort", () => {
    const { percent, total } = percentForChoice(
      {
        "ch01_delete_or_shot.delete": 40,
        "ch01_delete_or_shot.screenshot": 60,
      },
      "ch01_delete_or_shot.screenshot",
      ["ch01_delete_or_shot.delete", "ch01_delete_or_shot.screenshot"],
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
        decisionId: "ch01_delete_or_shot",
        choiceId: "ch01_delete_or_shot.screenshot",
        prompt: "异常样本出现时",
        shortLabel: "截图备份",
        sceneId: "ch01_office_delete_or_shot",
      },
    ];
    const rows = buildEchoRows({
      storyId: "ch01",
      picks,
      counts: CHOICE_STATS_SEED,
      sourceNote: "test",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.percentSame).toBeTypeOf("number");
    expect(rows[0]?.yourLabel).toBe("截图备份");
  });
});

describe("choice stats local store", () => {
  it("increments and reads", () => {
    incrementLocalChoice("ch01_delete_or_shot.delete");
    incrementLocalChoice("ch01_delete_or_shot.delete", 2);
    expect(getLocalChoiceCounts()["ch01_delete_or_shot.delete"]).toBe(3);
  });
});
