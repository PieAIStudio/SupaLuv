import type { AiBranchProvider, AiBranchRequest, AiBranchResult } from "./aiBranchTypes";

/**
 * Local demo provider — no API keys.
 * Proves UX: wait → AI choice → short side beats → forced rejoin.
 * Live path later: server using @pieai/swimmer-ai-kit OpenRouter + moderation.
 */
const VARIANTS: readonly Omit<AiBranchResult, "rejoinSceneId" | "provider">[] = [
  {
    choiceLabel: "把文件夹藏进 node_modules，谁会翻那里",
    beats: [
      {
        speaker: "苏明",
        text: "他新建了路径：node_modules/.cache/not_for_review。这不是犯罪，这是依赖管理。",
        artKey: "bg-office-night",
        portraitKey: "suming-panic",
        mood: "panic",
      },
      {
        speaker: "旁白",
        text: "三秒后手机震了一下。物业从不关心你的 npm 树，只关心你的包裹。",
        artKey: "bg-office-night",
        portraitKey: "suming-shame",
        mood: "shame",
      },
    ],
  },
  {
    choiceLabel: "改文件名：warmth_sample_final_FINAL_v3",
    beats: [
      {
        speaker: "苏明",
        text: "他把那行字另存为正经样本名。屏幕上像完成了一次合规表演。",
        artKey: "bg-office-night",
        portraitKey: "suming-restless",
        mood: "restless",
      },
      {
        speaker: "旁白",
        text: "表演结束。真正的推送从裤袋里亮起来——物业短信比任何 final 都准时。",
        artKey: "bg-office-night",
        portraitKey: "suming-shame",
        mood: "shame",
      },
    ],
  },
  {
    choiceLabel: "截图后立刻 blur，假装在做脱敏",
    beats: [
      {
        speaker: "苏明",
        text: "高斯模糊盖住关键词。他告诉自己：这是隐私工程，不是心虚。",
        artKey: "bg-office-night",
        portraitKey: "suming-panic",
        mood: "panic",
      },
    ],
  },
];

function pickVariant(seed: string): (typeof VARIANTS)[number] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return VARIANTS[hash % VARIANTS.length]!;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = window.setTimeout(() => resolve(), ms);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export function createMockAiBranchProvider(): AiBranchProvider {
  return {
    id: "mock",
    async generate(request: AiBranchRequest): Promise<AiBranchResult> {
      const maxBeats = Math.max(1, Math.min(4, request.config.maxAiBeats ?? 2));
      // Simulate network + model latency so "等待灵感" is visible.
      await delay(900 + Math.floor(Math.random() * 700), request.signal);

      const variant = pickVariant(
        `${request.storyId}:${request.sceneId}:${request.authoredChoiceLabels.join("|")}`,
      );
      const artPool = request.config.artPool ?? [];
      const portraitPool = request.config.portraitPool ?? [];

      const beats = variant.beats.slice(0, maxBeats).map((beat) => ({
        ...beat,
        artKey: beat.artKey && artPool.includes(beat.artKey) ? beat.artKey : artPool[0],
        portraitKey:
          beat.portraitKey && portraitPool.includes(beat.portraitKey)
            ? beat.portraitKey
            : portraitPool[0],
      }));

      return {
        choiceLabel: variant.choiceLabel,
        beats,
        rejoinSceneId: request.config.rejoinSceneId,
        provider: "mock",
      };
    },
  };
}
