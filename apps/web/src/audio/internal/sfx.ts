/**
 * One-shot SFX cache (never a duck owner).
 */

import { resolveSfxCatalogEntry } from "../audioCatalog";
import { clamp01 } from "../audioMixState";
import { createEngineHowl, stopAndUnload } from "../howlerEngine";
import type { GameAudioRuntime, GameSfxKey } from "./runtime";

export function playSfx(
  rt: GameAudioRuntime,
  key: GameSfxKey | null | undefined,
  volume = 0.7,
): void {
  const entry = resolveSfxCatalogEntry(key);
  if (!entry || rt.muted || rt.sfxVolume === 0) {
    return;
  }

  let howl = rt.sfxCache.get(entry.id);
  if (!howl) {
    let created: ReturnType<typeof createEngineHowl>;
    const releaseFailed = () => {
      if (rt.sfxCache.get(entry.id) === created) {
        rt.sfxCache.delete(entry.id);
        stopAndUnload(created);
      }
    };
    created = createEngineHowl({
      src: entry.src,
      loop: false,
      volume: 1,
      reverb: 0.08,
      onloaderror: releaseFailed,
      onplayerror: releaseFailed,
    });
    howl = created;
    rt.sfxCache.set(entry.id, howl);
  }
  if (entry.repeat === "restart" && howl.playing()) {
    howl.stop();
  }
  howl.volume(clamp01(volume * rt.sfxVolume));
  howl.play();
}

export function stopSfx(rt: GameAudioRuntime): void {
  for (const howl of rt.sfxCache.values()) {
    stopAndUnload(howl);
  }
  rt.sfxCache.clear();
}
