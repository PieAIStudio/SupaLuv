import { describe, expect, it } from "vitest";
import { DialogueVoicePlaybackGuard } from "../../apps/web/src/audio/dialogueVoicePlaybackGuard";

const RUN_A = "1:draft-ch01";
const RUN_B = "2:draft-ch01";
const LINE_A = "scene-1:line-a";
const LINE_B = "scene-1:line-b";

describe("DialogueVoicePlaybackGuard", () => {
  it("suppresses same-line multi-volume restore and allows the next line once", () => {
    const guard = new DialogueVoicePlaybackGuard();

    expect(
      guard.claimLine({
        runKey: RUN_A,
        lineKey: LINE_A,
        voiceEnabled: false,
        requestEligible: false,
      }),
    ).toBe(false);

    // Settings-like sequence: 0 -> 0.4 -> 0.5 (boolean still true after first restore).
    guard.syncVolume({ runKey: RUN_A, voiceEnabled: true });
    expect(
      guard.claimLine({
        runKey: RUN_A,
        lineKey: LINE_A,
        voiceEnabled: true,
        requestEligible: true,
      }),
    ).toBe(false);
    expect(
      guard.claimLine({
        runKey: RUN_A,
        lineKey: LINE_A,
        voiceEnabled: true,
        requestEligible: true,
      }),
    ).toBe(false);

    expect(
      guard.claimLine({
        runKey: RUN_A,
        lineKey: LINE_B,
        voiceEnabled: true,
        requestEligible: true,
      }),
    ).toBe(true);
    expect(
      guard.claimLine({
        runKey: RUN_A,
        lineKey: LINE_B,
        voiceEnabled: true,
        requestEligible: true,
      }),
    ).toBe(false);
  });

  it("keeps ineligible open lines claimable after sign-in, but suppresses via App volume while unmounted", () => {
    const guard = new DialogueVoicePlaybackGuard();

    expect(
      guard.claimLine({
        runKey: RUN_A,
        lineKey: LINE_A,
        voiceEnabled: true,
        requestEligible: false,
      }),
    ).toBe(false);

    // Later becomes eligible (auth/token/enable) — still the same open line.
    expect(
      guard.claimLine({
        runKey: RUN_A,
        lineKey: LINE_A,
        voiceEnabled: true,
        requestEligible: true,
      }),
    ).toBe(true);

    // Fresh opportunity path for Settings unmount: open line, then volume zero in App.
    const settingsGuard = new DialogueVoicePlaybackGuard();
    expect(
      settingsGuard.claimLine({
        runKey: RUN_A,
        lineKey: LINE_A,
        voiceEnabled: true,
        requestEligible: false,
      }),
    ).toBe(false);
    // Hook unmounted; App still syncs volume to zero and must suppress A.
    settingsGuard.syncVolume({ runKey: RUN_A, voiceEnabled: false });
    settingsGuard.syncVolume({ runKey: RUN_A, voiceEnabled: true });
    expect(
      settingsGuard.claimLine({
        runKey: RUN_A,
        lineKey: LINE_A,
        voiceEnabled: true,
        requestEligible: true,
      }),
    ).toBe(false);
    expect(
      settingsGuard.claimLine({
        runKey: RUN_A,
        lineKey: LINE_B,
        voiceEnabled: true,
        requestEligible: true,
      }),
    ).toBe(true);
  });

  it("keeps a claimed line false across Settings remount and positive volume updates", () => {
    const guard = new DialogueVoicePlaybackGuard();

    expect(
      guard.claimLine({
        runKey: RUN_A,
        lineKey: LINE_A,
        voiceEnabled: true,
        requestEligible: true,
      }),
    ).toBe(true);

    // Simulate unmount (no hook) then remount with positive voice.
    guard.syncVolume({ runKey: RUN_A, voiceEnabled: true });
    expect(
      guard.claimLine({
        runKey: RUN_A,
        lineKey: LINE_A,
        voiceEnabled: true,
        requestEligible: true,
      }),
    ).toBe(false);
    expect(
      guard.claimLine({
        runKey: RUN_A,
        lineKey: LINE_A,
        voiceEnabled: true,
        requestEligible: true,
      }),
    ).toBe(false);
  });

  it("resets on runKey change so the same textual lineKey can speak once on a new run", () => {
    const guard = new DialogueVoicePlaybackGuard();

    expect(
      guard.claimLine({
        runKey: RUN_A,
        lineKey: LINE_A,
        voiceEnabled: true,
        requestEligible: true,
      }),
    ).toBe(true);
    expect(
      guard.claimLine({
        runKey: RUN_A,
        lineKey: LINE_A,
        voiceEnabled: true,
        requestEligible: true,
      }),
    ).toBe(false);

    expect(
      guard.claimLine({
        runKey: RUN_B,
        lineKey: LINE_A,
        voiceEnabled: true,
        requestEligible: true,
      }),
    ).toBe(true);
    expect(
      guard.claimLine({
        runKey: RUN_B,
        lineKey: LINE_A,
        voiceEnabled: true,
        requestEligible: true,
      }),
    ).toBe(false);
  });

  it("treats positive volume as a boolean gate (numeric gain is not a claim trigger)", () => {
    // Pure boolean derivation used by App/hook: positive numbers collapse to true.
    const voiceEnabledFrom = (voiceVolume: number): boolean => voiceVolume > 0;
    expect(voiceEnabledFrom(0.4)).toBe(true);
    expect(voiceEnabledFrom(0.5)).toBe(true);
    expect(voiceEnabledFrom(0.4)).toBe(voiceEnabledFrom(0.5));

    const guard = new DialogueVoicePlaybackGuard();
    expect(
      guard.claimLine({
        runKey: RUN_A,
        lineKey: LINE_A,
        voiceEnabled: voiceEnabledFrom(0.4),
        requestEligible: true,
      }),
    ).toBe(true);
    // 0.4 -> 0.5 does not re-open a claimed line.
    expect(
      guard.claimLine({
        runKey: RUN_A,
        lineKey: LINE_A,
        voiceEnabled: voiceEnabledFrom(0.5),
        requestEligible: true,
      }),
    ).toBe(false);
  });
});
