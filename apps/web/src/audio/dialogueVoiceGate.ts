/**
 * Pure gates for dialogue TTS start/play so mute and voice=0 cannot leave a
 * hanging request that resurrects audio after a late network completion.
 */

export function canStartDialogueVoiceRequest(input: {
  readonly enabled: boolean;
  readonly masterMuted: boolean;
  readonly isSignedIn: boolean;
  readonly hasAccessToken: boolean;
  readonly hasText: boolean;
  readonly productMuted: boolean;
  readonly voiceVolume: number;
}): boolean {
  return (
    input.enabled &&
    !input.masterMuted &&
    input.isSignedIn &&
    input.hasAccessToken &&
    input.hasText &&
    !input.productMuted &&
    input.voiceVolume > 0
  );
}

export function canPlayDialogueVoiceResult(input: {
  readonly isCurrent: boolean;
  readonly productMuted: boolean;
  readonly voiceVolume: number;
}): boolean {
  return input.isCurrent && !input.productMuted && input.voiceVolume > 0;
}
