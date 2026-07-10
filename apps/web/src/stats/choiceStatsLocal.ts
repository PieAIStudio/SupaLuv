/**
 * Per-device contribution store. Decoupled from path memory / achievements.
 */

import type { ChoiceCountMap } from "./choiceStatsTypes";

const KEY = "supaluv.choice-stats.v1";

function loadRaw(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "number" && Number.isFinite(v) && v > 0) {
        out[k] = Math.floor(v);
      }
    }
    return out;
  } catch {
    return {};
  }
}

function saveRaw(map: Record<string, number>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // quota / private mode — ignore
  }
}

export function getLocalChoiceCounts(): ChoiceCountMap {
  return loadRaw();
}

export function incrementLocalChoice(choiceId: string, by = 1): ChoiceCountMap {
  const map = loadRaw();
  map[choiceId] = (map[choiceId] ?? 0) + Math.max(1, Math.floor(by));
  saveRaw(map);
  return map;
}

/** Test seam */
export function replaceLocalChoiceCountsForTesting(next: ChoiceCountMap): void {
  saveRaw({ ...next });
}
