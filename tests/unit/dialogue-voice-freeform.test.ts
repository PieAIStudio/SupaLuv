/**
 * Dialogue free-form TTS capability gate: when freeform is off, no synthesize
 * request is planned and the voice button stays disabled.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canStartDialogueVoiceRequest,
  dialogueVoiceButtonState,
} from "../../apps/web/src/audio/dialogueVoiceGate";
import {
  loadTtsCapability,
  resetTtsCapabilityCacheForTests,
} from "../../apps/web/src/audio/ttsCapability";

afterEach(() => {
  resetTtsCapabilityCacheForTests();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Mirrors useDialogueVoice requestEligible decision (pure). */
function planDialogueVoiceRequest(input: {
  readonly freeformEnabled: boolean | null;
  readonly enabled: boolean;
  readonly isSignedIn: boolean;
  readonly hasAccessToken: boolean;
  readonly hasText: boolean;
  readonly masterMuted: boolean;
  readonly productMuted: boolean;
  readonly voiceVolume: number;
}): { readonly shouldRequest: boolean; readonly buttonDisabled: boolean } {
  if (input.freeformEnabled === null) {
    const button = dialogueVoiceButtonState({ freeformEnabled: null });
    return { shouldRequest: false, buttonDisabled: button.disabled };
  }
  const shouldRequest = canStartDialogueVoiceRequest({
    enabled: input.enabled,
    freeformEnabled: input.freeformEnabled,
    masterMuted: input.masterMuted,
    isSignedIn: input.isSignedIn,
    hasAccessToken: input.hasAccessToken,
    hasText: input.hasText,
    productMuted: input.productMuted,
    voiceVolume: input.voiceVolume,
  });
  const button = dialogueVoiceButtonState({ freeformEnabled: input.freeformEnabled });
  return { shouldRequest, buttonDisabled: button.disabled };
}

describe("useDialogueVoice freeform degradation", () => {
  const signedInReady = {
    enabled: true,
    isSignedIn: true,
    hasAccessToken: true,
    hasText: true,
    masterMuted: false,
    productMuted: false,
    voiceVolume: 0.8,
  } as const;

  it("does not plan a synthesize request when freeformEnabled is false", () => {
    const plan = planDialogueVoiceRequest({ ...signedInReady, freeformEnabled: false });
    expect(plan.shouldRequest).toBe(false);
    expect(plan.buttonDisabled).toBe(true);
  });

  it("does not plan a request while capability is still unknown", () => {
    const plan = planDialogueVoiceRequest({ ...signedInReady, freeformEnabled: null });
    expect(plan.shouldRequest).toBe(false);
    expect(plan.buttonDisabled).toBe(true);
  });

  it("plans a request only when freeform is on and other gates pass", () => {
    const plan = planDialogueVoiceRequest({ ...signedInReady, freeformEnabled: true });
    expect(plan.shouldRequest).toBe(true);
    expect(plan.buttonDisabled).toBe(false);
  });

  it("loads freeform=false from health and keeps request blocked", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tts: { providers: { elevenlabs: true, minimax: false }, freeformEnabled: false },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const cap = await loadTtsCapability();
    expect(cap.freeformEnabled).toBe(false);

    const plan = planDialogueVoiceRequest({
      ...signedInReady,
      freeformEnabled: cap.freeformEnabled,
    });
    expect(plan.shouldRequest).toBe(false);
    expect(plan.buttonDisabled).toBe(true);
    // Health probe only — no /tts/synthesize.
    expect(fetchMock.mock.calls.every((call) => String(call[0]).includes("health"))).toBe(true);
  });
});
