/**
 * Four-layer release audio façade with independent stage music and ambience.
 *
 * Priority and mixing contract:
 * 1. master mute and cutscene pause stop bed playback;
 * 2. voice is the only duck owner and lowers music + ambient while active;
 * 3. SFX never become a second duck owner;
 * 4. stage playback selects music and location ambience independently, with a
 *    legacy exclusive fallback only when neither dedicated key is authored.
 *
 * Implementation is split across `./internal/*` facets; this module remains the
 * sole public export surface. Consumer import paths are unchanged.
 */

import * as beds from "./internal/beds";
import * as core from "./internal/core";
import { classifyBed, isSceneCueSfx } from "./internal/helpers";
import {
  createGameAudioRuntime,
  type GameAudioRuntime,
  type GameBedKey,
  type GameSfxKey,
  type NowPlayingListener,
  type StageBedSelectionInput,
} from "./internal/runtime";
import * as sfx from "./internal/sfx";
import * as voice from "./internal/voice";

export type {
  AudioPlaybackSnapshot,
  GameBedKey,
  GameBgmKey,
  GameSfxKey,
  StageBedPlaybackResult,
  StageBedSelectionInput,
} from "./internal/runtime";
export type { AudioBedKind } from "./internal/runtime";

export { classifyBed, isSceneCueSfx };

export class GameAudioController {
  private readonly rt: GameAudioRuntime = createGameAudioRuntime();

  isMuted(): boolean {
    return core.isMuted(this.rt);
  }

  isUnlocked(): boolean {
    return core.isUnlocked(this.rt);
  }

  getMusicVolume(): number {
    return core.getMusicVolume(this.rt);
  }

  getAmbientVolume(): number {
    return core.getAmbientVolume(this.rt);
  }

  getSfxVolume(): number {
    return core.getSfxVolume(this.rt);
  }

  getVoiceVolume(): number {
    return core.getVoiceVolume(this.rt);
  }

  getReverbAmount(): number {
    return core.getReverbAmount(this.rt);
  }

  getBgmVolume(): number {
    return core.getBgmVolume(this.rt);
  }

  getPlaybackSnapshot() {
    return core.getPlaybackSnapshot(this.rt);
  }

  setMusicVolume(next: number): void {
    core.setMusicVolume(this.rt, next);
  }

  setAmbientVolume(next: number): void {
    core.setAmbientVolume(this.rt, next);
  }

  setSfxVolume(next: number): void {
    core.setSfxVolume(this.rt, next);
  }

  setVoiceVolume(next: number): void {
    core.setVoiceVolume(this.rt, next);
  }

  setReverbAmount(next: number): void {
    core.setReverbAmount(this.rt, next);
  }

  setBgmVolume(next: number): void {
    core.setBgmVolume(this.rt, next);
  }

  setMuted(next: boolean): void {
    core.setMuted(this.rt, next);
  }

  unlock(): void {
    core.unlock(this.rt);
  }

  preload(): void {
    core.preload();
  }

  stopVoice(): void {
    voice.stopVoice(this.rt);
  }

  playVoiceFromBase64(
    base64: string,
    mimeType = "audio/mpeg",
    options?: { speaker?: string; side?: "left" | "right" | "center" },
  ): boolean {
    return voice.playVoiceFromBase64(this.rt, base64, mimeType, options);
  }

  playSfx(key: GameSfxKey | null | undefined, volume = 0.7): void {
    sfx.playSfx(this.rt, key, volume);
  }

  playExclusiveBed(key: GameBedKey | null | undefined): void {
    beds.playExclusiveBed(this.rt, key);
  }

  playStageBeds(input: StageBedSelectionInput) {
    return beds.playStageBeds(this.rt, input);
  }

  playBed(key: GameBedKey | null | undefined): void {
    beds.playBed(this.rt, key);
  }

  playBgm(key: GameBedKey | null | undefined): void {
    beds.playBgm(this.rt, key);
  }

  playMusic(key: GameBedKey | null | undefined): void {
    beds.playMusic(this.rt, key);
  }

  playAmbient(key: GameBedKey | null | undefined): void {
    beds.playAmbient(this.rt, key);
  }

  previewMusic(): void {
    beds.previewMusic(this.rt);
  }

  previewAmbient(): void {
    beds.previewAmbient(this.rt);
  }

  pauseBedsForCutscene(): void {
    beds.pauseBedsForCutscene(this.rt);
  }

  resumeBedsAfterCutscene(): void {
    beds.resumeBedsAfterCutscene(this.rt);
  }

  pauseBgmForCutscene(): void {
    beds.pauseBedsForCutscene(this.rt);
  }

  resumeBgmAfterCutscene(): void {
    beds.resumeBedsAfterCutscene(this.rt);
  }

  stopMusic(): void {
    beds.stopMusic(this.rt);
  }

  stopAmbient(): void {
    beds.stopAmbient(this.rt);
  }

  stopSfx(): void {
    sfx.stopSfx(this.rt);
  }

  stopBgm(): void {
    beds.stopBgm(this.rt);
  }

  stopAll(): void {
    core.stopAll(this.rt);
  }

  currentMusic(): string | null {
    return beds.currentMusic(this.rt);
  }

  currentAmbient(): string | null {
    return beds.currentAmbient(this.rt);
  }

  getNowPlayingKey(): string | null {
    return beds.getNowPlayingKey(this.rt);
  }

  onNowPlayingChange(listener: NowPlayingListener): () => void {
    return beds.onNowPlayingChange(this.rt, listener);
  }
}

export const gameAudio = new GameAudioController();
