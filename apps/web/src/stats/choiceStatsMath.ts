import type {
  ChoiceCountMap,
  ChoiceEchoRow,
  ChoiceStatsAuthority,
  ChoiceStatsProvenance,
  SessionChoicePick,
} from "./choiceStatsTypes";
import { decisionsForStory } from "./choiceStatsCatalog";

/** Below this, hide percent (seed usually keeps us above). */
export const MIN_SAMPLE_FOR_PERCENT = 8;

export function mergeCountMaps(...maps: readonly ChoiceCountMap[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const map of maps) {
    for (const [key, value] of Object.entries(map)) {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        out[key] = (out[key] ?? 0) + Math.floor(value);
      }
    }
  }
  return out;
}

export function cohortFromPercent(percent: number | null): {
  kind: ChoiceEchoRow["cohortKind"];
  label: string;
} {
  if (percent === null) {
    return { kind: "thin", label: "样本不足" };
  }
  if (percent >= 55) {
    return { kind: "majority", label: "多数派" };
  }
  if (percent <= 32) {
    return { kind: "minority", label: "少数派" };
  }
  return { kind: "mid", label: "中位" };
}

export function percentForChoice(
  counts: ChoiceCountMap,
  choiceId: string,
  siblingIds: readonly string[],
  minSample = MIN_SAMPLE_FOR_PERCENT,
): { percent: number | null; total: number } {
  let total = 0;
  for (const id of siblingIds) {
    total += counts[id] ?? 0;
  }
  if (total < minSample) {
    return { percent: null, total };
  }
  const mine = counts[choiceId] ?? 0;
  return { percent: Math.round((100 * mine) / total), total };
}

export function buildEchoRows(args: {
  readonly storyId: string;
  readonly picks: readonly SessionChoicePick[];
  readonly counts: ChoiceCountMap;
  readonly authority: ChoiceStatsAuthority;
  readonly provenance: ChoiceStatsProvenance;
}): ChoiceEchoRow[] {
  const decisions = decisionsForStory(args.storyId);
  const byDecision = new Map(decisions.map((d) => [d.decisionId, d]));
  const rows: ChoiceEchoRow[] = [];
  const seen = new Set<string>();

  for (const pick of args.picks) {
    if (seen.has(pick.decisionId)) {
      continue;
    }
    seen.add(pick.decisionId);
    const decision = byDecision.get(pick.decisionId);
    const siblingIds = decision?.options.map((o) => o.choiceId) ?? [pick.choiceId];
    const { percent, total } = percentForChoice(args.counts, pick.choiceId, siblingIds);
    const cohort = cohortFromPercent(percent);
    rows.push({
      decisionId: pick.decisionId,
      prompt: pick.prompt,
      yourLabel: pick.shortLabel,
      yourChoiceId: pick.choiceId,
      percentSame: percent,
      totalSamples: total,
      cohortKind: cohort.kind,
      cohortLabel: cohort.label,
      authority: args.authority,
      provenance: args.provenance,
    });
  }

  return rows;
}

/**
 * Reward projection must consume explicit authority, never infer trust from
 * percentages, labels, sample size, or provenance copy.
 */
export function rewardSignalsForEchoRows(rows: readonly ChoiceEchoRow[]): {
  readonly hasRareEcho: boolean;
  readonly hasReverseCurrent: boolean;
} {
  const authoritativeMinorityCount = rows.filter(
    (row) => row.authority === "authoritative" && row.cohortKind === "minority",
  ).length;
  return {
    hasRareEcho: authoritativeMinorityCount >= 1,
    hasReverseCurrent: authoritativeMinorityCount >= 3,
  };
}
