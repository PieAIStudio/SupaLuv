import { describe, expect, it } from "vitest";
import {
  canPlayDialogueVoiceResult,
  canStartDialogueVoiceRequest,
} from "../../apps/web/src/audio/dialogueVoiceGate";
import { DialogueVoiceSession } from "../../apps/web/src/audio/dialogueVoiceSession";

describe("DialogueVoiceSession", () => {
  it("aborts the previous request when a line is skipped or retried", () => {
    const session = new DialogueVoiceSession();
    const first = session.begin();
    const second = session.begin();

    expect(first.controller.signal.aborted).toBe(true);
    expect(session.isCurrent(first)).toBe(false);
    expect(session.isCurrent(second)).toBe(true);
  });

  it("makes repeated cancel idempotent and rejects late completions", () => {
    const session = new DialogueVoiceSession();
    const ticket = session.begin();
    session.cancel();
    session.cancel();

    expect(ticket.controller.signal.aborted).toBe(true);
    expect(session.isCurrent(ticket)).toBe(false);
  });

  it("cancels in-flight work on master mute so a late completion is not current", () => {
    const session = new DialogueVoiceSession();
    const ticket = session.begin();
    // masterMuted flip re-runs the hook effect → cancel (same path as unmount/skip)
    session.cancel();
    expect(ticket.controller.signal.aborted).toBe(true);
    expect(
      canPlayDialogueVoiceResult({
        isCurrent: session.isCurrent(ticket),
        productMuted: true,
        voiceVolume: 0.8,
      }),
    ).toBe(false);
  });
});

describe("dialogue voice mute/volume gates", () => {
  const ready = {
    enabled: true,
    masterMuted: false,
    isSignedIn: true,
    hasAccessToken: true,
    hasText: true,
    productMuted: false,
    voiceVolume: 0.8,
    freeformEnabled: true,
  } as const;

  it("blocks request start on master mute or voice volume zero", () => {
    expect(canStartDialogueVoiceRequest(ready)).toBe(true);
    expect(canStartDialogueVoiceRequest({ ...ready, masterMuted: true })).toBe(false);
    expect(canStartDialogueVoiceRequest({ ...ready, productMuted: true })).toBe(false);
    expect(canStartDialogueVoiceRequest({ ...ready, voiceVolume: 0 })).toBe(false);
  });

  it("blocks request start when free-form TTS capability is off", () => {
    expect(canStartDialogueVoiceRequest({ ...ready, freeformEnabled: false })).toBe(false);
  });

  it("rejects stale completion after mute or voice-zero even if the ticket was current", () => {
    const session = new DialogueVoiceSession();
    const ticket = session.begin();

    expect(
      canPlayDialogueVoiceResult({
        isCurrent: session.isCurrent(ticket),
        productMuted: false,
        voiceVolume: 0.8,
      }),
    ).toBe(true);

    // Mute while in flight: product mute gate blocks play without waiting for epoch.
    expect(
      canPlayDialogueVoiceResult({
        isCurrent: session.isCurrent(ticket),
        productMuted: true,
        voiceVolume: 0.8,
      }),
    ).toBe(false);

    // Voice volume 0 after request started: no play, no future delivery semantic.
    expect(
      canPlayDialogueVoiceResult({
        isCurrent: session.isCurrent(ticket),
        productMuted: false,
        voiceVolume: 0,
      }),
    ).toBe(false);

    session.cancel();
    expect(
      canPlayDialogueVoiceResult({
        isCurrent: session.isCurrent(ticket),
        productMuted: false,
        voiceVolume: 0.8,
      }),
    ).toBe(false);
  });
});
