/**
 * Pure gates for dialogue TTS start/play so mute and voice=0 cannot leave a
 * hanging request that resurrects audio after a late network completion.
 * Also respects server free-form capability so the client never 400-spams.
 */

export function canStartDialogueVoiceRequest(input: {
  readonly enabled: boolean;
  readonly masterMuted: boolean;
  readonly isSignedIn: boolean;
  readonly hasAccessToken: boolean;
  readonly hasText: boolean;
  readonly productMuted: boolean;
  readonly voiceVolume: number;
  /** Server free-form policy from health; false/unknown blocks synthesize. */
  readonly freeformEnabled: boolean;
}): boolean {
  return (
    input.enabled &&
    input.freeformEnabled &&
    !input.masterMuted &&
    input.isSignedIn &&
    input.hasAccessToken &&
    input.hasText &&
    !input.productMuted &&
    input.voiceVolume > 0
  );
}

/** UI affordance for the dialogue voice control when free-form is off. */
export function dialogueVoiceButtonState(input: { readonly freeformEnabled: boolean | null }): {
  readonly disabled: boolean;
  readonly visible: boolean;
  /** i18n key for tooltip / aria when disabled by capability. */
  readonly tooltipKey: "play.voiceBudgetCharging" | null;
} {
  // null = still probing; show disabled so players see the affordance, not a 400.
  if (input.freeformEnabled === true) {
    return { disabled: false, visible: false, tooltipKey: null };
  }
  return {
    disabled: true,
    visible: true,
    tooltipKey: "play.voiceBudgetCharging",
  };
}

export function canPlayDialogueVoiceResult(input: {
  readonly isCurrent: boolean;
  readonly productMuted: boolean;
  readonly voiceVolume: number;
}): boolean {
  return input.isCurrent && !input.productMuted && input.voiceVolume > 0;
}
