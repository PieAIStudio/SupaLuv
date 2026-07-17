/**
 * Pure narrative source precedence for play composition.
 * Guest remote → AI beat → authored Ink/presentation.
 */

export const GUEST_WAIT_TEXT = "等待房主开始游玩…（在另一标签页用同一房间码进入同玩）" as const;
export const GUEST_WAIT_SPEAKER = "同玩" as const;
export const GUEST_WAIT_SCENE_TITLE = "同玩围观" as const;

export interface PlaybackLocaleCopy {
  readonly guestWaitText: string;
  readonly guestWaitSpeaker: string;
  readonly guestWaitScene: string;
  readonly branchScene: string;
  readonly scene: string;
}

const DEFAULT_PLAYBACK_COPY: PlaybackLocaleCopy = {
  guestWaitText: GUEST_WAIT_TEXT,
  guestWaitSpeaker: GUEST_WAIT_SPEAKER,
  guestWaitScene: GUEST_WAIT_SCENE_TITLE,
  branchScene: "旁支",
  scene: "场景",
};

export interface RemoteStorySource {
  readonly sceneId: string | null;
  readonly sceneTitle: string;
  readonly speaker: string;
  readonly text: string;
  readonly isComplete: boolean;
  readonly isEnded: boolean;
  readonly choices: readonly { readonly index: number; readonly text: string }[];
  readonly mianzi: number;
  readonly ai_score: number;
  readonly aiMode: boolean;
}

export interface ActiveAiBeatSource {
  readonly speaker: string;
  readonly text: string;
}

export interface PlaybackSourceInput {
  readonly isGuestSpectator: boolean;
  readonly remoteStory: RemoteStorySource | null;
  readonly aiPlaying: boolean;
  readonly activeAiBeat: ActiveAiBeatSource | null;
  readonly snapshotText: string;
  readonly presentationSpeaker: string;
  readonly sceneTitle: string | null | undefined;
  readonly snapshotSceneId: string | null;
  readonly snapshotMianzi: number;
  readonly snapshotAiScore: number;
  readonly snapshotChoices: readonly {
    readonly index: number;
    readonly text: string;
    readonly choiceId?: string | null;
  }[];
  readonly aiBeatIndex: number;
  readonly copy?: PlaybackLocaleCopy;
}

export interface PlaybackSourceProjection {
  readonly rawText: string;
  readonly rawSpeaker: string;
  readonly sceneTitle: string;
  readonly voiceLineKey: string;
  readonly mianzi: number;
  readonly ai_score: number;
  readonly choices: readonly {
    readonly index: number;
    readonly text: string;
    readonly choiceId?: string | null;
  }[];
  readonly typewriterEnabled: boolean;
  readonly remoteIsComplete: boolean | undefined;
  readonly remoteAiMode: boolean | undefined;
  readonly remoteIsEnded: boolean;
  readonly remoteSceneId: string | null;
}

export function clampMeter(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/** Authored vs AI beat vs co-play guest source precedence (raw, pre-display-name). */
export function resolveRawDialogue(input: {
  readonly isGuestSpectator: boolean;
  readonly remoteStory: RemoteStorySource | null;
  readonly activeAiBeat: ActiveAiBeatSource | null;
  readonly snapshotText: string;
  readonly presentationSpeaker: string;
  readonly copy?: PlaybackLocaleCopy;
}): { readonly text: string; readonly speaker: string } {
  const copy = input.copy ?? DEFAULT_PLAYBACK_COPY;
  if (input.isGuestSpectator) {
    return {
      text: input.remoteStory?.text ?? copy.guestWaitText,
      speaker: input.remoteStory?.speaker ?? copy.guestWaitSpeaker,
    };
  }
  return {
    text: input.activeAiBeat?.text ?? input.snapshotText,
    speaker: input.activeAiBeat?.speaker ?? input.presentationSpeaker,
  };
}

export function resolveSceneTitle(input: {
  readonly isGuestSpectator: boolean;
  readonly remoteStory: RemoteStorySource | null;
  readonly aiPlaying: boolean;
  readonly sceneTitle: string | null | undefined;
  readonly copy?: PlaybackLocaleCopy;
}): string {
  const copy = input.copy ?? DEFAULT_PLAYBACK_COPY;
  if (input.isGuestSpectator) {
    return input.remoteStory?.sceneTitle || copy.guestWaitScene;
  }
  if (input.aiPlaying) {
    return `${input.sceneTitle ?? copy.branchScene} · AI`;
  }
  return input.sceneTitle ?? copy.scene;
}

/**
 * Exact line-key identity for TTS restart / guest / AI / Ink.
 * Guest keys use remote scene + text prefix; AI uses beat index; Ink uses text prefix.
 */
export function resolveVoiceLineKey(input: {
  readonly isGuestSpectator: boolean;
  readonly remoteStory: RemoteStorySource | null;
  readonly aiPlaying: boolean;
  readonly snapshotSceneId: string | null;
  readonly snapshotText: string;
  readonly aiBeatIndex: number;
}): string {
  if (input.isGuestSpectator) {
    return `guest:${input.remoteStory?.sceneId ?? ""}:${input.remoteStory?.text?.slice(0, 24) ?? ""}`;
  }
  if (input.aiPlaying) {
    return `ai:${input.snapshotSceneId}:${input.aiBeatIndex}`;
  }
  return `ink:${input.snapshotSceneId}:${input.snapshotText.slice(0, 24)}`;
}

export function resolvePlaybackMeters(input: {
  readonly isGuestSpectator: boolean;
  readonly remoteStory: RemoteStorySource | null;
  readonly snapshotMianzi: number;
  readonly snapshotAiScore: number;
}): { readonly mianzi: number; readonly ai_score: number } {
  if (input.isGuestSpectator) {
    return {
      mianzi: clampMeter(input.remoteStory?.mianzi ?? 50),
      ai_score: clampMeter(input.remoteStory?.ai_score ?? 50),
    };
  }
  return {
    mianzi: clampMeter(input.snapshotMianzi),
    ai_score: clampMeter(input.snapshotAiScore),
  };
}

/** Panel / vote choice projection: guest sees remote choices only. */
export function resolvePanelChoices(input: {
  readonly isGuestSpectator: boolean;
  readonly remoteStory: RemoteStorySource | null;
  readonly snapshotChoices: readonly {
    readonly index: number;
    readonly text: string;
    readonly choiceId?: string | null;
  }[];
}): readonly {
  readonly index: number;
  readonly text: string;
  readonly choiceId?: string | null;
}[] {
  if (input.isGuestSpectator) {
    return input.remoteStory?.choices ?? [];
  }
  return input.snapshotChoices;
}

/**
 * Dialogue complete: guest prefers remote completion flag when present;
 * host/solo uses typewriter completion only.
 */
export function resolveDialogueComplete(input: {
  readonly isGuestSpectator: boolean;
  readonly remoteIsComplete: boolean | undefined;
  readonly typewriterComplete: boolean;
}): boolean {
  if (input.isGuestSpectator) {
    return input.remoteIsComplete ?? input.typewriterComplete;
  }
  return input.typewriterComplete;
}

export function resolvePlaybackSource(input: PlaybackSourceInput): PlaybackSourceProjection {
  const raw = resolveRawDialogue(input);
  const meters = resolvePlaybackMeters(input);
  return {
    rawText: raw.text,
    rawSpeaker: raw.speaker,
    sceneTitle: resolveSceneTitle(input),
    voiceLineKey: resolveVoiceLineKey({
      isGuestSpectator: input.isGuestSpectator,
      remoteStory: input.remoteStory,
      aiPlaying: input.aiPlaying,
      snapshotSceneId: input.snapshotSceneId,
      snapshotText: input.snapshotText,
      aiBeatIndex: input.aiBeatIndex,
    }),
    mianzi: meters.mianzi,
    ai_score: meters.ai_score,
    choices: resolvePanelChoices(input),
    typewriterEnabled: !input.isGuestSpectator || Boolean(input.remoteStory),
    remoteIsComplete: input.isGuestSpectator ? Boolean(input.remoteStory?.isComplete) : undefined,
    remoteAiMode: input.isGuestSpectator ? Boolean(input.remoteStory?.aiMode) : undefined,
    remoteIsEnded: Boolean(input.remoteStory?.isEnded),
    remoteSceneId: input.remoteStory?.sceneId ?? null,
  };
}
