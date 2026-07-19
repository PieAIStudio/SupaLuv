export interface AiBranchRequestBody {
  readonly storyId: string;
  readonly sceneId: string;
  readonly config: {
    readonly enabled: true;
    readonly rejoinSceneId: string;
    readonly maxAiBeats?: number;
    readonly context: string;
    readonly artPool?: readonly string[];
    readonly portraitPool?: readonly string[];
    readonly speakerPool?: readonly string[];
  };
  readonly authoredChoiceLabels: readonly string[];
  readonly meters?: { mianzi: number; ai_score: number };
  /**
   * UI locale for generated choice labels + beat prose.
   * `en` / `en-*` → English; anything else defaults to zh-CN.
   * Optional for backward compatibility with older clients.
   */
  readonly locale?: string;
}

export interface AiBranchBeat {
  readonly speaker: string;
  readonly text: string;
  readonly artKey?: string;
  readonly portraitKey?: string;
  readonly mood?: string;
}

export interface AiBranchResponseBody {
  readonly choiceLabel: string;
  readonly beats: readonly AiBranchBeat[];
  readonly rejoinSceneId: string;
  readonly provider: string;
}
