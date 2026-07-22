import { describe, expect, it } from "vitest";
import {
  getInterstitialText,
  INTERSTITIAL_LINES,
  resolveInterstitialLang,
} from "../../apps/web/src/ai/interstitialLines";
import {
  buildInterstitialSequence,
  sequenceFromSeed,
  sequenceStepIndex,
  startIndexFromSeed,
} from "../../apps/web/src/ai/interstitialRotation";

describe("interstitial lines catalog", () => {
  it("exports 15 stable-id lines with non-empty zh/en copy", () => {
    expect(INTERSTITIAL_LINES).toHaveLength(15);
    const ids = new Set<string>();
    for (const line of INTERSTITIAL_LINES) {
      expect(line.id.length).toBeGreaterThan(0);
      expect(ids.has(line.id)).toBe(false);
      ids.add(line.id);
      expect(line.zh.length).toBeGreaterThan(4);
      expect(line.en.length).toBeGreaterThan(4);
    }
  });

  it("keeps owner-final Chinese and English strings byte-stable", () => {
    expect(INTERSTITIAL_LINES[0]!.zh).toBe(
      "心动引擎用户条款第 3.1 条：心动属于您，心动数据属于我们。",
    );
    expect(INTERSTITIAL_LINES[0]!.en).toBe(
      "Heartbeat Engine ToS §3.1: Your heartbeat is yours. Your heartbeat data is ours.",
    );
    expect(INTERSTITIAL_LINES[14]!.zh).toBe("《适配日报》：今日宜表白。系统已替您起草。");
    expect(INTERSTITIAL_LINES[14]!.en).toBe(
      "Adaptation Daily: Today is auspicious for confessions. The system has drafted yours.",
    );
  });

  it("maps zh-CN to zh and other locales to en", () => {
    expect(resolveInterstitialLang("zh-CN")).toBe("zh");
    expect(resolveInterstitialLang("zh")).toBe("zh");
    expect(resolveInterstitialLang("en")).toBe("en");
    expect(resolveInterstitialLang("ja")).toBe("en");
    expect(getInterstitialText(INTERSTITIAL_LINES[9]!, "zh")).toContain("可交付版本");
    expect(getInterstitialText(INTERSTITIAL_LINES[9]!, "en")).toContain("deliverable");
  });
});

describe("interstitial rotation pure functions", () => {
  const n = INTERSTITIAL_LINES.length;

  it("is stable for the same seed", () => {
    const a = sequenceFromSeed(42, n);
    const b = sequenceFromSeed(42, n);
    expect(a).toEqual(b);
    expect(a).toHaveLength(n);
  });

  it("different seeds can start at different indices", () => {
    const starts = new Set([0, 1, 7, 14, 100, 999].map((seed) => startIndexFromSeed(seed, n)));
    expect(starts.size).toBeGreaterThan(1);
  });

  it("full cycle has no immediate adjacent repeats when n > 1", () => {
    for (const seed of [0, 3, 11, 128, 4096]) {
      const sequence = sequenceFromSeed(seed, n);
      expect(sequence).toHaveLength(n);
      for (let i = 1; i < sequence.length; i += 1) {
        expect(sequence[i]).not.toBe(sequence[i - 1]);
      }
      // One full cycle visits each line once.
      expect(new Set(sequence).size).toBe(n);
    }
  });

  it("walks sequential order from start (wraps, no shuffle)", () => {
    const start = 5;
    const sequence = buildInterstitialSequence(start, n);
    expect(sequence[0]).toBe(5);
    expect(sequence[1]).toBe(6);
    expect(sequence[n - 1]).toBe(4);
  });

  it("step helper is modular and stable", () => {
    const sequence = sequenceFromSeed(0, n);
    expect(sequenceStepIndex(sequence, 0)).toBe(sequence[0]);
    expect(sequenceStepIndex(sequence, n)).toBe(sequence[0]);
    expect(sequenceStepIndex(sequence, n + 3)).toBe(sequence[3]);
  });

  it("handles empty / single-line edge cases", () => {
    expect(sequenceFromSeed(9, 0)).toEqual([]);
    expect(sequenceFromSeed(9, 1)).toEqual([0]);
    expect(startIndexFromSeed(-3, n)).toBeGreaterThanOrEqual(0);
    expect(startIndexFromSeed(-3, n)).toBeLessThan(n);
  });
});
