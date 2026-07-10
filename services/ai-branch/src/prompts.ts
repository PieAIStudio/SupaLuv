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
  readonly meters?: { dignity: number; impulse: number };
}

export function buildAiBranchMessages(input: BranchPromptInput): Array<{
  role: "system" | "user";
  content: string;
}> {
  const system = `你是「超级爱人 / SupaLuv」互动影游的旁支编剧。
产品是成人黑色喜剧，不是色情生成器。

硬性规则：
1. 只生成【一个】额外选项文案 + 最多 ${input.maxAiBeats} 句短旁支对白。
2. 旁支结束后故事必须回到作者写的节点（rejoinSceneId 已给定，你必须原样返回）。
3. 禁止露骨性行为描写、未成年人、仇恨、真实犯罪教唆。
4. 语气：程序员尴尬、体面崩坏、黑色幽默。
5. artKey / portraitKey 只能从允许列表里选；没有就省略该字段。
6. speaker 只能从允许列表里选。
7. 输出必须是单个 JSON 对象，不要 markdown。

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

  const user = JSON.stringify(
    {
      storyId: input.storyId,
      sceneId: input.sceneId,
      authorBrief: input.context,
      authoredChoicesAlreadyShown: input.authoredChoiceLabels,
      rejoinSceneId: input.rejoinSceneId,
      maxAiBeats: input.maxAiBeats,
      allowedArtKeys: input.artPool,
      allowedPortraitKeys: input.portraitPool,
      allowedSpeakers: input.speakerPool,
      meters: input.meters ?? null,
      task: "写一个与预写选项不同、更怂/更程序员的第三条选择，并给短旁支后回到 rejoin。",
    },
    null,
    2,
  );

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
