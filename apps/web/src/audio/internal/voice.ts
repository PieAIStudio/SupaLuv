/**
 * TTS voice playback and duck ownership (voice is the only duck owner).
 */

import { createEngineHowl, panForSpeaker, stopAndUnload } from "../howlerEngine";
import { mimeToHowlerFormat } from "./helpers";
import { applyBedMix, resolveMix } from "./mix";
import { unlock } from "./core";
import { VOICE_DUCK_ATTACK_MS, VOICE_DUCK_RELEASE_MS, type GameAudioRuntime } from "./runtime";

export function stopVoice(rt: GameAudioRuntime): void {
  const hadActiveVoice = rt.voiceActive || Boolean(rt.voiceHowl || rt.voiceObjectUrl);
  stopAndUnload(rt.voiceHowl);
  rt.voiceHowl = null;
  if (rt.voiceObjectUrl) {
    URL.revokeObjectURL(rt.voiceObjectUrl);
    rt.voiceObjectUrl = null;
  }
  rt.voiceActive = false;
  if (hadActiveVoice) {
    applyBedMix(rt, VOICE_DUCK_RELEASE_MS);
  }
}

export function playVoiceFromBase64(
  rt: GameAudioRuntime,
  base64: string,
  mimeType = "audio/mpeg",
  options?: { speaker?: string; side?: "left" | "right" | "center" },
): boolean {
  unlock(rt);
  stopVoice(rt);
  if (rt.muted || rt.voiceVolume === 0 || !base64) {
    return false;
  }

  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    const safeMime = mimeType || "audio/mpeg";
    const format = mimeToHowlerFormat(safeMime);
    if (!format) {
      return false;
    }
    const blob = new Blob([bytes], { type: safeMime });
    const objectUrl = URL.createObjectURL(blob);
    rt.voiceObjectUrl = objectUrl;
    const pan = panForSpeaker(options?.speaker ?? "", options?.side);
    let howl: ReturnType<typeof createEngineHowl> | null = null;
    const release = () => {
      // Owner-safe: only tear down if this attempt still owns the URL/howl.
      // Covers immediate construct errors before `rt.voiceHowl` is assigned.
      if (rt.voiceObjectUrl === objectUrl || (howl !== null && rt.voiceHowl === howl)) {
        stopVoice(rt);
      }
    };
    howl = createEngineHowl({
      src: objectUrl,
      loop: false,
      volume: resolveMix(rt).voice,
      pan,
      reverb: rt.reverbAmount * 0.65,
      html5: false,
      format,
      onend: release,
      onloaderror: release,
      onplayerror: release,
    });
    // Sync onloaderror may have already released URL/duck via `release`.
    if (rt.voiceObjectUrl !== objectUrl) {
      stopAndUnload(howl);
      return false;
    }
    rt.voiceHowl = howl;
    rt.voiceActive = true;
    applyBedMix(rt, VOICE_DUCK_ATTACK_MS);
    howl.play();
    return true;
  } catch {
    stopVoice(rt);
    return false;
  }
}
