/**
 * Pure narrative source precedence for play composition.
 * Guest remote → AI beat → authored Ink/presentation.
 */

export const GUEST_WAIT_TEXT = "等待房主开始游玩…（在另一标签页用同一房间码进入同玩）" as const;
export const GUEST_WAIT_SPEAKER = "同玩" as const;
export const GUEST_WAIT_SCENE_TITLE = "同玩围观" as const;

export interface RemoteStorySource {
  readonly sceneId: string | null;
  readonly sceneTitle: string;
  readonly speaker: string;
  readonly text: string;
  readonly isComplete: boolean;
  readonly isEnded: boolean;
  readonly choices: readonly { readonly index: number; readonly text: string }[];
  readonly dignity: number;
  readonly impulse: number;
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
  readonly snapshotDignity: number;
  readonly snapshotImpulse: number;
  readonly snapshotChoices: readonly {
    readonly index: number;
    readonly text: string;
    readonly choiceId?: string | null;
  }[];
  readonly aiBeatIndex: number;
}

export interface PlaybackSourceProjection {
  readonly rawText: string;
  readonly rawSpeaker: string;
  readonly sceneTitle: string;
  readonly voiceLineKey: string;
  readonly dignity: number;
  readonly impulse: number;
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
}): { readonly text: string; readonly speaker: string } {
  if (input.isGuestSpectator) {
    return {
      text: input.remoteStory?.text ?? GUEST_WAIT_TEXT,
      speaker: input.remoteStory?.speaker ?? GUEST_WAIT_SPEAKER,
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
}): string {
  if (input.isGuestSpectator) {
    return input.remoteStory?.sceneTitle || GUEST_WAIT_SCENE_TITLE;
  }
  if (input.aiPlaying) {
    return `${input.sceneTitle ?? "旁支"} · AI`;
  }
  return input.sceneTitle ?? "场景";
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
  readonly snapshotDignity: number;
  readonly snapshotImpulse: number;
}): { readonly dignity: number; readonly impulse: number } {
  if (input.isGuestSpectator) {
    return {
      dignity: clampMeter(input.remoteStory?.dignity ?? 50),
      impulse: clampMeter(input.remoteStory?.impulse ?? 50),
    };
  }
  return {
    dignity: clampMeter(input.snapshotDignity),
    impulse: clampMeter(input.snapshotImpulse),
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
    dignity: meters.dignity,
    impulse: meters.impulse,
    choices: resolvePanelChoices(input),
    typewriterEnabled: !input.isGuestSpectator || Boolean(input.remoteStory),
    remoteIsComplete: input.isGuestSpectator ? Boolean(input.remoteStory?.isComplete) : undefined,
    remoteAiMode: input.isGuestSpectator ? Boolean(input.remoteStory?.aiMode) : undefined,
    remoteIsEnded: Boolean(input.remoteStory?.isEnded),
    remoteSceneId: input.remoteStory?.sceneId ?? null,
  };
}
