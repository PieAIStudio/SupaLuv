/**
 * Cost-transparency copy when free players hit battery-gated AI.
 * Owner (ADR-0003): no free AI quota; prefab story free; thin margin on AI compute.
 */

export interface AiBatteryPitch {
  readonly title: string;
  readonly body: string;
  readonly ctaLogin: string;
  readonly ctaTopUp: string;
}

const ZH: AiBatteryPitch = {
  title: "AI 灵感需要电池",
  body: [
    "主线剧本、存档、重玩——这些已经免费开放。",
    "做成这款互动影游本身要花大量时间与钱；实时 AI 每次都会向模型与语音服务付费。",
    "我们不提供「白嫖 AI 次数」：不让免费用户把算力账单转嫁给制作方。",
    "你充的电池，大部分用于覆盖 AI 成本，我们只留很薄的一点余量，好让项目活下去。",
    "对你来说，仍是用很小的花费，换一次会被故事记住的即兴——占便宜的是体验，不是算力。",
  ].join(""),
  ctaLogin: "登录后查看电池",
  ctaTopUp: "了解电池（即将支持充能）",
};

const EN: AiBatteryPitch = {
  title: "AI needs batteries",
  body: [
    "The authored story, saves, and replays are free.",
    "Building this game already costs real time and money; every live AI call pays model and voice providers.",
    "There is no free AI quota — we will not subsidize free users' compute bills.",
    "Most of what you spend covers AI cost; we only keep a thin margin so the project can survive.",
    "You still get a bargain: a short improvisation the story can remember, not an open tab of free GPU.",
  ].join(" "),
  ctaLogin: "Sign in to see batteries",
  ctaTopUp: "Battery top-up (coming soon)",
};

export function getAiBatteryPitch(locale: string): AiBatteryPitch {
  if (locale.toLowerCase().startsWith("zh")) {
    return ZH;
  }
  return EN;
}

/** One-line chip for choice row / needs_auth strip. */
export function getAiBatteryPitchOneLiner(locale: string): string {
  if (locale.toLowerCase().startsWith("zh")) {
    return "预制主线免费 · AI 用电池（无免费次数）";
  }
  return "Prefab story free · AI uses batteries (no free quota)";
}
