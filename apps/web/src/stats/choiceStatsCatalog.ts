/**
 * Whitelist of stats-visible chapter decisions.
 * Continue-only beats are intentionally omitted.
 * Match uses substrings of choice labels; choiceId is the stable analytics key.
 */

import type { StatsDecisionDef, StatsOptionDef } from "./choiceStatsTypes";

export const CHOICE_STATS_CATALOG: readonly StatsDecisionDef[] = [
  {
    storyId: "draft-ch01",
    sceneId: "dch01_s003",
    decisionId: "d1_bones",
    prompt: "协议：字面与骨头",
    options: [
      {
        choiceId: "d1_bones_accept",
        match: "至少说人话了",
        shortLabel: "点头：至少说人话了",
      },
      {
        choiceId: "d1_bones_cold",
        match: "后门也算诚实",
        shortLabel: "冷笑：后门也算诚实",
      },
    ],
  },
  {
    storyId: "draft-ch01",
    sceneId: "dch01_s005",
    decisionId: "d1_tell_breakup",
    prompt: "AI 要真实倾诉",
    options: [
      {
        choiceId: "d1_tell_flat",
        match: "分手了。昨天",
        shortLabel: "平平地说：分手了。昨天。",
      },
      {
        choiceId: "d1_tell_hard",
        match: "真实的你们要吗",
        shortLabel: "更硬一点：真实的你们要吗",
      },
    ],
  },
  {
    storyId: "draft-ch02",
    sceneId: "dch02_s005",
    decisionId: "d2_snack",
    prompt: "惠万家 · 偷辣条",
    options: [
      {
        choiceId: "d2_catch_firm",
        match: "按住手腕",
        shortLabel: "按住手腕：拿出来",
      },
      {
        choiceId: "d2_catch_soft",
        match: "声音放轻",
        shortLabel: "声音放轻一点，还是要拿出来",
      },
    ],
  },
  {
    storyId: "draft-ch02",
    sceneId: "dch02_s013",
    decisionId: "d2_admit",
    prompt: "石佩欣问谁提的分手",
    options: [
      {
        choiceId: "d2_admit_me",
        match: "我提的",
        shortLabel: "分了……我提的",
      },
      {
        choiceId: "d2_admit_me_hard",
        match: "硬着头皮",
        shortLabel: "硬着头皮：我提的",
      },
    ],
  },
];

export function decisionsForStory(storyId: string): readonly StatsDecisionDef[] {
  return CHOICE_STATS_CATALOG.filter((d) => d.storyId === storyId);
}

export function findDecision(storyId: string, sceneId: string): StatsDecisionDef | null {
  return CHOICE_STATS_CATALOG.find((d) => d.storyId === storyId && d.sceneId === sceneId) ?? null;
}

export function matchOption(
  decision: StatsDecisionDef,
  choiceLabel: string,
): StatsOptionDef | null {
  const trimmed = choiceLabel.trim();
  for (const option of decision.options) {
    if (trimmed.includes(option.match) || trimmed.startsWith(option.match)) {
      return option;
    }
  }
  return null;
}

/** Resolve a play-time choice into a stats pick, or null if not stats-visible. */
export function resolveStatsPick(
  storyId: string,
  sceneId: string | null | undefined,
  choiceLabel: string,
): {
  decision: StatsDecisionDef;
  option: StatsOptionDef;
} | null {
  if (!sceneId || !choiceLabel.trim()) {
    return null;
  }
  const decision = findDecision(storyId, sceneId);
  if (!decision) {
    return null;
  }
  const option = matchOption(decision, choiceLabel);
  if (!option) {
    return null;
  }
  return { decision, option };
}
