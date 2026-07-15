export type ExpectedTtsRoute = "chinese" | "western";
export type ExpectedTtsLanguage = "zh-CN" | "en";

export interface TtsRoutingFixture {
  readonly name: string;
  readonly text: string;
  readonly fallbackLanguage: "zh-CN" | "en";
  readonly expectedRouteSet: readonly ExpectedTtsRoute[];
  readonly expectedMixed: boolean;
}

export interface TtsExpectedSegment {
  readonly index: number;
  readonly text: string;
  readonly language: ExpectedTtsLanguage;
  readonly route: ExpectedTtsRoute;
}

export interface TtsFragmentRoutingFixture {
  readonly name: string;
  readonly text: string;
  readonly fallbackLanguage: "zh-CN" | "en";
  readonly expectedSegments: readonly TtsExpectedSegment[];
}

/**
 * One fixture drives both browser and service planners. The first four strings
 * are copied from the two current draft chapters; the rest freeze allowlist
 * casing and counterexamples that must never inherit the Chinese lane.
 */
export const TTS_ROUTING_FIXTURES: readonly TtsRoutingFixture[] = [
  {
    name: "chapter 1 AI borrowing",
    text: '"你听起来在硬撑。"AI 忽然说，"是不是在假装坚强？"',
    fallbackLanguage: "zh-CN",
    expectedRouteSet: ["chinese"],
    expectedMixed: false,
  },
  {
    name: "chapter 1 OK borrowing",
    text: '雷欧对着听筒喊："九百？OK……地址发我，现在。"',
    fallbackLanguage: "zh-CN",
    expectedRouteSet: ["chinese"],
    expectedMixed: false,
  },
  {
    name: "chapter 1 Live counterexample",
    text: '"他们听。"雷欧比划着自己的耳朵，中英文夹生地往外蹦，"Live，实时。不是你说完就没了。我听见他们笑了。"',
    fallbackLanguage: "zh-CN",
    expectedRouteSet: ["chinese", "western"],
    expectedMixed: true,
  },
  {
    name: "chapter 2 App and AI borrowings",
    text: "苏明一眼就认出了这句话。App 里那个 AI，开口没两句就是这一句。",
    fallbackLanguage: "zh-CN",
    expectedRouteSet: ["chinese"],
    expectedMixed: false,
  },
  {
    name: "allowlist is case insensitive",
    text: "现在用 ai、APP、Ok 和 openai。",
    fallbackLanguage: "zh-CN",
    expectedRouteSet: ["chinese"],
    expectedMixed: false,
  },
  {
    name: "Very is not borrowed",
    text: "这真的 Very 离谱。",
    fallbackLanguage: "zh-CN",
    expectedRouteSet: ["chinese", "western"],
    expectedMixed: true,
  },
  {
    name: "ordinary English token is not borrowed",
    text: "这是一段 robot 测试。",
    fallbackLanguage: "zh-CN",
    expectedRouteSet: ["chinese", "western"],
    expectedMixed: true,
  },
  {
    name: "multi-word English stays Western",
    text: "他说 Very Live，现在走。",
    fallbackLanguage: "zh-CN",
    expectedRouteSet: ["chinese", "western"],
    expectedMixed: true,
  },
  {
    name: "unknown brand stays Western",
    text: "未知品牌 SupaLuv 也不能借道。",
    fallbackLanguage: "zh-CN",
    expectedRouteSet: ["chinese", "western"],
    expectedMixed: true,
  },
  {
    name: "pure English ignores Chinese fallback",
    text: "Only English here. Another sentence!",
    fallbackLanguage: "zh-CN",
    expectedRouteSet: ["western"],
    expectedMixed: false,
  },
] as const;

/**
 * Exact segment/route sequences for independent per-Latin-fragment classification.
 * Both browser and service planners must equal these arrays, not merely share output.
 */
export const TTS_FRAGMENT_ROUTING_FIXTURES: readonly TtsFragmentRoutingFixture[] = [
  {
    name: "allowed and disallowed Latin fragments classify independently",
    text: "AI 说 Live，实时。",
    fallbackLanguage: "zh-CN",
    expectedSegments: [
      { index: 0, text: "AI 说", language: "zh-CN", route: "chinese" },
      { index: 1, text: "Live，", language: "en", route: "western" },
      { index: 2, text: "实时。", language: "zh-CN", route: "chinese" },
    ],
  },
  {
    name: "multiple separated allowlisted fragments survive an unknown fragment",
    text: "App 里的 robot 说 OK。",
    fallbackLanguage: "zh-CN",
    expectedSegments: [
      { index: 0, text: "App 里的", language: "zh-CN", route: "chinese" },
      { index: 1, text: "robot", language: "en", route: "western" },
      { index: 2, text: "说 OK。", language: "zh-CN", route: "chinese" },
    ],
  },
] as const;
