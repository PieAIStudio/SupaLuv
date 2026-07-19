export interface BranchPromptInput {
  readonly storyId: string;
  readonly sceneId: string;
  readonly context: string;
  readonly authoredChoiceLabels: readonly string[];
  readonly rejoinSceneId: string;
  readonly maxAiBeats: number;
  readonly artPool: readonly string[];
  readonly portraitPool: readonly string[];
  readonly speakerPool: readonly string[];
  readonly meters?: { mianzi: number; ai_score: number };
  /** UI locale; en* → English output, else Chinese. */
  readonly locale?: string;
}

function isEnglishLocale(locale: string | undefined): boolean {
  return Boolean(locale && locale.toLowerCase().startsWith("en"));
}

export function buildAiBranchMessages(input: BranchPromptInput): Array<{
  role: "system" | "user";
  content: string;
}> {
  const english = isEnglishLocale(input.locale);
  const system = english
    ? `You are the side-branch writer for the interactive cinema game SupaLuv (超级爱人).
Product tone: adult black comedy / sex comedy — not a porn generator.

Hard rules:
1. Generate exactly ONE extra choice label + at most ${input.maxAiBeats} short branch dialogue beats.
2. After the branch the story MUST return to the authored node (rejoinSceneId is given; return it unchanged).
3. No explicit sex, minors, hate, or real-crime instruction.
4. Tone: awkward programmer dignity, company polite-horror, dry self-deprecation. Funny in English (understatement, corporate euphemism) — not translated-Chinese jokes.
5. artKey / portraitKey only from allowed lists; omit if none fit.
6. speaker only from the allowed list (names may be Chinese ids even when dialogue is English).
7. Output a single JSON object, no markdown.
8. All player-visible strings (choiceLabel and every beat text) MUST be English.

JSON schema:
{
  "choiceLabel": string,          // button label, ≤48 chars, English
  "beats": [
    {
      "speaker": string,
      "text": string,             // 1-3 English sentences
      "artKey"?: string,
      "portraitKey"?: string,
      "mood"?: string
    }
  ],
  "rejoinSceneId": string         // must equal the given rejoinSceneId
}`
    : `你是「超级爱人 / SupaLuv」互动影游的旁支编剧。
产品是成人黑色喜剧，不是色情生成器。

硬性规则：
1. 只生成【一个】额外选项文案 + 最多 ${input.maxAiBeats} 句短旁支对白。
2. 旁支结束后故事必须回到作者写的节点（rejoinSceneId 已给定，你必须原样返回）。
3. 禁止露骨性行为描写、未成年人、仇恨、真实犯罪教唆。
4. 语气：程序员尴尬、体面崩坏、黑色幽默。
5. artKey / portraitKey 只能从允许列表里选；没有就省略该字段。
6. speaker 只能从允许列表里选。
7. 输出必须是单个 JSON 对象，不要 markdown。
8. 玩家可见文案（choiceLabel 与每句 beat text）必须用中文。

JSON schema:
{
  "choiceLabel": string,          // 玩家按钮上的选项，≤28 字
  "beats": [
    {
      "speaker": string,
      "text": string,             // 1-3 句中文
      "artKey"?: string,
      "portraitKey"?: string,
      "mood"?: string
    }
  ],
  "rejoinSceneId": string         // 必须等于给定的 rejoinSceneId
}`;

  const task = english
    ? "Write a third option that differs from the authored choices — more cowardly / more programmer — plus a short English side branch that rejoins."
    : "写一个与预写选项不同、更怂/更程序员的第三条选择，并给短旁支后回到 rejoin。";

  const user = JSON.stringify(
    {
      storyId: input.storyId,
      sceneId: input.sceneId,
      locale: english ? "en" : "zh-CN",
      outputLanguage: english ? "en" : "zh-CN",
      authorBrief: input.context,
      authoredChoicesAlreadyShown: input.authoredChoiceLabels,
      rejoinSceneId: input.rejoinSceneId,
      maxAiBeats: input.maxAiBeats,
      allowedArtKeys: input.artPool,
      allowedPortraitKeys: input.portraitPool,
      allowedSpeakers: input.speakerPool,
      meters: input.meters ?? null,
      task,
    },
    null,
    2,
  );

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
