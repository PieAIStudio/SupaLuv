/**
 * Browser presentation catalog for stats-visible chapter decisions.
 * Production storyId → decisionId/choiceId relationships come only from
 * `@supaluv/shared/choice-stats-catalog`. This file adds scene match labels.
 */

import {
  PRODUCTION_CHOICE_STATS_CATALOG,
  isPermittedChoiceOnStory,
} from "@supaluv/shared/choice-stats-catalog";
import type { StatsDecisionDef, StatsOptionDef } from "./choiceStatsTypes";

interface PresentationOption {
  readonly choiceId: string;
  readonly match: string;
  readonly shortLabel: string;
}

interface PresentationDecision {
  readonly sceneId: string;
  readonly prompt: string;
  readonly options: readonly PresentationOption[];
}

/** Presentation overlay keyed by `${storyId}:${decisionId}`. */
const PRESENTATION_BY_DECISION: Readonly<Record<string, PresentationDecision>> = {
  "draft-ch01:d1_bones": {
    sceneId: "dch01_s003",
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
  "draft-ch01:d1_tell_breakup": {
    sceneId: "dch01_s005",
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
  "draft-ch02:d2_snack": {
    sceneId: "dch02_s005",
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
  "draft-ch02:d2_admit": {
    sceneId: "dch02_s013",
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
};

function buildCatalog(): readonly StatsDecisionDef[] {
  const out: StatsDecisionDef[] = [];
  for (const entry of PRODUCTION_CHOICE_STATS_CATALOG) {
    const key = `${entry.storyId}:${entry.decisionId}`;
    const presentation = PRESENTATION_BY_DECISION[key];
    if (!presentation) {
      throw new Error(`Missing choice-stats presentation for ${key}`);
    }
    const options: StatsOptionDef[] = entry.choiceIds.map((choiceId) => {
      if (!isPermittedChoiceOnStory(entry.storyId, choiceId)) {
        throw new Error(`Catalog drift: ${entry.storyId}/${choiceId} not permitted`);
      }
      const option = presentation.options.find((item) => item.choiceId === choiceId);
      if (!option) {
        throw new Error(`Missing presentation option for ${key}/${choiceId}`);
      }
      return {
        choiceId,
        match: option.match,
        shortLabel: option.shortLabel,
      };
    });
    out.push({
      storyId: entry.storyId,
      sceneId: presentation.sceneId,
      decisionId: entry.decisionId,
      prompt: presentation.prompt,
      options,
    });
  }
  return out;
}

export const CHOICE_STATS_CATALOG: readonly StatsDecisionDef[] = buildCatalog();

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
  if (!isPermittedChoiceOnStory(storyId, option.choiceId)) {
    return null;
  }
  return { decision, option };
}
