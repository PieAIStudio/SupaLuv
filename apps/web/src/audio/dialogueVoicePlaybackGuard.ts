/**
 * App-owned in-memory guard for dialogue TTS request opportunity.
 *
 * Survives play → Settings → play remounts for a single story revision, remembers
 * volume-suppressed and already-claimed lines, and never reopens them when volume
 * is restored. Resets only when the run key changes (new game / resume / chapter).
 */

export type DialogueVoiceLineState = "open" | "suppressed" | "claimed";

export interface DialogueVoicePlaybackGuardApi {
  syncVolume(input: {
    readonly runKey: string;
    readonly voiceEnabled: boolean;
  }): void;

  claimLine(input: {
    readonly runKey: string;
    readonly lineKey: string;
    readonly voiceEnabled: boolean;
    /** All non-volume start gates and non-mixed segmentation already passed. */
    readonly requestEligible: boolean;
  }): boolean;
}

export class DialogueVoicePlaybackGuard implements DialogueVoicePlaybackGuardApi {
  private runKey: string | null = null;
  private voiceEnabled = false;
  private lineKey: string | null = null;
  private lineState: DialogueVoiceLineState | null = null;

  syncVolume(input: { readonly runKey: string; readonly voiceEnabled: boolean }): void {
    this.applyRunAndVolume(input.runKey, input.voiceEnabled);
  }

  claimLine(input: {
    readonly runKey: string;
    readonly lineKey: string;
    readonly voiceEnabled: boolean;
    readonly requestEligible: boolean;
  }): boolean {
    this.applyRunAndVolume(input.runKey, input.voiceEnabled);

    if (this.lineKey !== input.lineKey) {
      this.lineKey = input.lineKey;
      this.lineState = input.voiceEnabled ? "open" : "suppressed";
    }

    if (!input.voiceEnabled) {
      if (this.lineKey !== null) {
        this.lineState = "suppressed";
      }
      return false;
    }

    if (this.lineState === "suppressed" || this.lineState === "claimed") {
      return false;
    }

    if (this.lineState === "open" && input.requestEligible) {
      this.lineState = "claimed";
      return true;
    }

    return false;
  }

  private applyRunAndVolume(runKey: string, voiceEnabled: boolean): void {
    if (this.runKey !== runKey) {
      this.runKey = runKey;
      this.lineKey = null;
      this.lineState = null;
    }
    this.voiceEnabled = voiceEnabled;
    if (!voiceEnabled && this.lineKey !== null) {
      this.lineState = "suppressed";
    }
  }
}
