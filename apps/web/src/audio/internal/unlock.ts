/**
 * Audio-context unlock (leaf helper).
 * Extracted so voice can unlock without importing core (breaks core↔voice cycle).
 */

import {
  setGlobalReverbWet,
  setHowlerMasterMute,
  unlockHowler,
} from "../howlerEngine";
import { applyBedMix, resumeBedsIfAllowed } from "./mix";
import type { GameAudioRuntime } from "./runtime";

export function unlock(rt: GameAudioRuntime): void {
  if (rt.unlocked) {
    return;
  }
  rt.unlocked = true;
  unlockHowler();
  // Re-assert product mute after context unlock; unlock must never unmute.
  setHowlerMasterMute(rt.muted);
  setGlobalReverbWet(rt.reverbAmount);
  applyBedMix(rt);
  resumeBedsIfAllowed(rt);
}
