/**
 * Heartbeat Engine worldbuilding interstitials shown during AI generation wait.
 * Product world copy — not UI chrome. Keep zh/en here; do not fold into i18n catalogs.
 * Copy is owner-final: do not rewrite or invent additional lines.
 */

export type InterstitialLang = "zh" | "en";

export interface InterstitialLine {
  readonly id: string;
  readonly zh: string;
  readonly en: string;
}

export const INTERSTITIAL_LINES: readonly InterstitialLine[] = [
  {
    id: "tos-3-1",
    zh: "心动引擎用户条款第 3.1 条：心动属于您，心动数据属于我们。",
    en: "Heartbeat Engine ToS §3.1: Your heartbeat is yours. Your heartbeat data is ours.",
  },
  {
    id: "ad-dali",
    zh: "广告：新一代伴侣机器人「大力」——他不懂爱，但他懂您的作息。",
    en: "Ad: Meet DALI, the next-gen companion bot — he doesn't understand love, but he understands your sleep schedule.",
  },
  {
    id: "review-records",
    zh: "体验官热评：「它从不评判我。它只是记录，然后卖掉。」",
    en: 'Verified review: "It never judges me. It just records, then sells."',
  },
  {
    id: "daily-volatility",
    zh: "《适配日报》：本季度情绪波动分创新高，恭喜全体用户。",
    en: "Adaptation Daily: Emotional-volatility scores hit a record high this quarter. Congratulations, everyone.",
  },
  {
    id: "tip-sincerity",
    zh: "心动引擎温馨提示：真诚是最高效的数据。",
    en: "A gentle reminder from Heartbeat Engine: sincerity is the most efficient data.",
  },
  {
    id: "tos-7-2",
    zh: "条款第 7.2 条：分手需提前 30 天向系统申请，恋爱不用。",
    en: "ToS §7.2: Breakups require 30 days' notice to the system. Falling in love does not.",
  },
  {
    id: "ad-calibration",
    zh: "广告：情绪校准服务·首次免费——毕竟第一次心动也是免费的。",
    en: "Ad: Emotion Calibration — first session free. After all, your first heartbeat was free too.",
  },
  {
    id: "review-ex",
    zh: "体验官热评：「比前任好，至少它宕机时会道歉。」",
    en: 'Verified review: "Better than my ex. At least it apologizes when it crashes."',
  },
  {
    id: "daily-late-night",
    zh: "《适配日报》：研究表明，深夜的您最诚实，也最值钱。",
    en: "Adaptation Daily: Studies show you are most honest — and most valuable — late at night.",
  },
  {
    id: "deliverable-love",
    zh: "心动引擎：我们不制造爱情，我们制造爱情的可交付版本。",
    en: "Heartbeat Engine: We don't make love. We make love's deliverable version.",
  },
  {
    id: "tos-12",
    zh: "条款第 12 条：卸载应用不代表它忘了您。",
    en: "ToS §12: Uninstalling the app doesn't mean it forgot you.",
  },
  {
    id: "tip-hesitation",
    zh: "温馨提示：您的每一次犹豫，都被温柔地计了分。",
    en: "A gentle reminder: every hesitation of yours is scored, tenderly.",
  },
  {
    id: "ad-membership",
    zh: "广告：会员连续包月——像爱情一样，忘记取消就会一直继续。",
    en: "Ad: Auto-renewing membership — like love, it continues until you remember to cancel.",
  },
  {
    id: "review-childhood",
    zh: "体验官热评：「我给它讲了我的童年，它给我推了个课程。」",
    en: 'Verified review: "I told it about my childhood. It recommended me a course."',
  },
  {
    id: "daily-confession",
    zh: "《适配日报》：今日宜表白。系统已替您起草。",
    en: "Adaptation Daily: Today is auspicious for confessions. The system has drafted yours.",
  },
] as const;

/** zh-CN → zh; every other app locale → en. */
export function resolveInterstitialLang(appLocale: string): InterstitialLang {
  return appLocale.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function getInterstitialText(line: InterstitialLine, lang: InterstitialLang): string {
  return lang === "zh" ? line.zh : line.en;
}
