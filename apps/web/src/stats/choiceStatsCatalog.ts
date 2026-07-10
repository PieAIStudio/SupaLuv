/**
 * Whitelist of stats-visible chapter decisions.
 * Continue-only beats are intentionally omitted.
 */

import type { StatsDecisionDef, StatsOptionDef } from "./choiceStatsTypes";

export const CHOICE_STATS_CATALOG: readonly StatsDecisionDef[] = [
  {
    storyId: "ch01",
    sceneId: "ch01_office_delete_or_shot",
    decisionId: "ch01_delete_or_shot",
    prompt: "异常样本出现时",
    options: [
      {
        choiceId: "ch01_delete_or_shot.delete",
        match: "立刻删掉",
        shortLabel: "立刻删除，假装没事",
      },
      {
        choiceId: "ch01_delete_or_shot.screenshot",
        match: "先截图备份",
        shortLabel: "截图备份 not_for_review",
      },
    ],
  },
  {
    storyId: "ch01",
    sceneId: "ch01_phone_buzz",
    decisionId: "ch01_property_timing",
    prompt: "林晓棠的定位短信",
    options: [
      {
        choiceId: "ch01_property_timing.go",
        match: "去物业",
        shortLabel: "立刻去物业",
      },
      {
        choiceId: "ch01_property_timing.delay",
        match: "先假装没看见",
        shortLabel: "先假装没看见",
      },
    ],
  },
  {
    storyId: "ch01",
    sceneId: "ch01_product_page",
    decisionId: "ch01_product_approach",
    prompt: "面对「不会嫌弃你」的产品页",
    options: [
      {
        choiceId: "ch01_product_approach.demo",
        match: "打开演示对话",
        shortLabel: "打开演示对话",
      },
      {
        choiceId: "ch01_product_approach.pay",
        match: "直接滑向支付",
        shortLabel: "直接滑向支付",
      },
      {
        choiceId: "ch01_product_approach.privacy",
        match: "先看三遍隐私政策",
        shortLabel: "假装技术调研（隐私政策）",
      },
      {
        choiceId: "ch01_product_approach.retreat",
        match: "返回出租屋",
        shortLabel: "返回出租屋再想想",
      },
    ],
  },
  {
    storyId: "ch01",
    sceneId: "ch01_demo_react",
    decisionId: "ch01_demo_react",
    prompt: "演示吐出同一句羞耻",
    options: [
      {
        choiceId: "ch01_demo_react.proceed",
        match: "继续下单流程",
        shortLabel: "继续下单",
      },
      {
        choiceId: "ch01_demo_react.close",
        match: "关掉演示",
        shortLabel: "关掉演示，心里更乱",
      },
    ],
  },
  {
    storyId: "ch01",
    sceneId: "ch01_courier_fantasy",
    decisionId: "ch01_checkout_nerve",
    prompt: "想象周鹿接快递电话之后",
    options: [
      {
        choiceId: "ch01_checkout_nerve.confirm",
        match: "确认地址，进入支付",
        shortLabel: "确认地址，进入支付",
      },
      {
        choiceId: "ch01_checkout_nerve.price",
        match: "再看一眼价格",
        shortLabel: "再看一眼价格",
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
