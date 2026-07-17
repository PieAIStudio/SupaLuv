import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCachedTtsCapability,
  loadTtsCapability,
  parseTtsCapabilityFromHealth,
  resetTtsCapabilityCacheForTests,
} from "../../apps/web/src/audio/ttsCapability";
import { dialogueVoiceButtonState } from "../../apps/web/src/audio/dialogueVoiceGate";

afterEach(() => {
  resetTtsCapabilityCacheForTests();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("parseTtsCapabilityFromHealth", () => {
  it("reads freeformEnabled and providers from the capability block", () => {
    expect(
      parseTtsCapabilityFromHealth({
        tts: {
          providers: { elevenlabs: true, minimax: false },
          freeformEnabled: true,
        },
      }),
    ).toEqual({
      providers: { elevenlabs: true, minimax: false },
      freeformEnabled: true,
    });
  });

  it("fail-closes freeform when the flag is missing or not true", () => {
    expect(parseTtsCapabilityFromHealth({ tts: { providers: {} } }).freeformEnabled).toBe(false);
    expect(
      parseTtsCapabilityFromHealth({ tts: { freeformEnabled: "1", providers: {} } })
        .freeformEnabled,
    ).toBe(false);
    expect(parseTtsCapabilityFromHealth(null).freeformEnabled).toBe(false);
  });

  it("accepts legacy flat provider flags under tts", () => {
    expect(
      parseTtsCapabilityFromHealth({
        tts: { elevenlabs: true, minimax: true, freeformEnabled: false },
      }),
    ).toEqual({
      providers: { elevenlabs: true, minimax: true },
      freeformEnabled: false,
    });
  });
});

describe("dialogueVoiceButtonState", () => {
  it("hides the affordance when freeform is on", () => {
    expect(dialogueVoiceButtonState({ freeformEnabled: true })).toEqual({
      disabled: false,
      visible: false,
      tooltipKey: null,
    });
  });

  it("shows a disabled self-aware chip while probing or when freeform is off", () => {
    expect(dialogueVoiceButtonState({ freeformEnabled: false })).toEqual({
      disabled: true,
      visible: true,
      tooltipKey: "play.voiceBudgetCharging",
    });
    expect(dialogueVoiceButtonState({ freeformEnabled: null })).toEqual({
      disabled: true,
      visible: true,
      tooltipKey: "play.voiceBudgetCharging",
    });
  });
});

describe("loadTtsCapability", () => {
  it("caches a successful health probe and does not re-fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tts: {
          providers: { elevenlabs: true, minimax: false },
          freeformEnabled: false,
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = await loadTtsCapability();
    const second = await loadTtsCapability();

    expect(first.freeformEnabled).toBe(false);
    expect(second).toBe(first);
    expect(getCachedTtsCapability()).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/ai/health");
  });

  it("fail-closes freeform on network errors without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const cap = await loadTtsCapability();
    expect(cap.freeformEnabled).toBe(false);
    expect(getCachedTtsCapability()?.freeformEnabled).toBe(false);
  });
});
