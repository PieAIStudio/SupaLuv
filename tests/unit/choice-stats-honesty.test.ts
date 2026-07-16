import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { hasAuthoritativeChoiceStatsCapability } from "@supaluv/shared/choice-stats-catalog";
import { lookupMessage, messagesFor } from "../../apps/web/src/i18n/catalog";
import {
  listPlayerVisibleAchievementDefs,
  loadAchievements,
  unlockAchievement,
} from "../../apps/web/src/persistence/achievements";
import { choiceStatsSourceNote } from "../../apps/web/src/stats/choiceStatsClient";
import { DEFAULT_SHARE_CARD_COPY } from "../../apps/web/src/views/play/lib/ShareCardExporter";

const STATS_SURFACE_KEYS = [
  "help.coPlayConflict",
  "help.socialTitle",
  "help.socialEcho",
  "help.socialOracle",
  "help.socialMinority",
  "help.socialShare",
  "chapterEnd.echoAria",
  "chapterEnd.echoTitle",
  "chapterEnd.echoLead",
  "chapterEnd.echoLoading",
  "chapterEnd.echoEmpty",
  "chapterEnd.insufficient",
  "chapterEnd.playersSame",
  "chapterEnd.echoSourceMemory",
  "chapterEnd.echoSourceSeed",
  "chapterEnd.cohort.majority",
  "chapterEnd.cohort.mid",
  "chapterEnd.cohort.minority",
  "chapterEnd.cohort.thin",
  "chapterEnd.shareEcho",
  "chapterEnd.shareSame",
  "coplay.rpsGlobalPercent",
  "coplay.rpsLoadingEcho",
  "coplay.rpsListenGlobal",
  "coplay.rpsSampleThin",
  "coplay.rpsUsedGlobal",
  "coplay.globalNoteHost",
  "coplay.globalNoteGuest",
] as const;

beforeAll(() => {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => store.set(key, String(value)),
      removeItem: (key: string) => store.delete(key),
      key: (index: number) => [...store.keys()][index] ?? null,
    },
    configurable: true,
    writable: true,
  });
});

beforeEach(() => {
  localStorage.clear();
});

describe("choice-stats player trust boundary", () => {
  it("has no authoritative stats capability in the current build", () => {
    expect(hasAuthoritativeChoiceStatsCapability()).toBe(false);
  });

  it("labels every active stats surface as a local demo sample without population claims", () => {
    for (const locale of ["en", "zh-CN"] as const) {
      const forbidden = locale === "en" ? /\b(?:global|community|players?)\b/i : /全球|社区|玩家/;
      const required = locale === "en" ? /local demo|trusted aggregate/i : /本地演示|可信聚合/;
      for (const key of STATS_SURFACE_KEYS) {
        const copy = lookupMessage(messagesFor(locale), key);
        expect(copy, `${locale}:${key}`).toBeTruthy();
        expect(copy, `${locale}:${key}`).not.toMatch(forbidden);
        expect(copy, `${locale}:${key}`).toMatch(required);
      }
    }

    for (const value of Object.values(DEFAULT_SHARE_CARD_COPY)) {
      if (value === DEFAULT_SHARE_CARD_COPY.echo || value === DEFAULT_SHARE_CARD_COPY.same) {
        expect(value).toContain("演示样本");
        expect(value).not.toMatch(/全球|社区|玩家/);
      }
    }
    expect(choiceStatsSourceNote(null)).not.toMatch(/全球|社区|玩家/);
    expect(choiceStatsSourceNote("anonymous-memory-aggregate")).not.toMatch(/全球|社区|玩家/);
  });

  it("hides and refuses stats-authority achievements while authority is absent", () => {
    const visibleIds = listPlayerVisibleAchievementDefs().map((def) => def.id);
    expect(visibleIds).not.toContain("rare_echo_path");
    expect(visibleIds).not.toContain("reverse_current");
    expect(visibleIds).not.toContain("oracle_hit");

    expect(unlockAchievement("rare_echo_path")).toBeNull();
    expect(unlockAchievement("reverse_current")).toBeNull();
    expect(unlockAchievement("oracle_hit")).toBeNull();
    expect(loadAchievements()).toEqual({});
  });
});
