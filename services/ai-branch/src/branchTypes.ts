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
  readonly meters?: { dignity: number; impulse: number };
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
