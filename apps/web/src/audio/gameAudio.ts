/**
 * Four-layer release audio façade.
 *
 * Priority and mixing contract:
 * 1. master mute and cutscene pause stop bed playback;
 * 2. voice is the only duck owner and lowers music + ambient while active;
 * 3. SFX never become a second duck owner;
 * 4. sequence playback uses one exclusive authored bed, while the controller
 *    still keeps independent music and ambient buses for previews/future cues.
 */

import {
  AUDIO_BED_CATALOG,
  AUDIO_SFX_CATALOG,
  resolveBedCatalogEntry,
  resolveSfxCatalogEntry,
  type AudioBedCatalogEntry,
  type AudioBedKind,
  type AudioBedId,
  type AudioSfxId,
} from "./audioCatalog";
import { clamp01, resolveAudioMixGains, type AudioDuckOwner } from "./audioMixState";
import {
  createEngineHowl,
  fadeHowl,
  panForSpeaker,
  setGlobalReverbWet,
  setHowlerMasterMute,
  stopAndUnload,
  unlockHowler,
  type CancelEngineFade,
  type EngineHowl,
} from "./howlerEngine";

const VOICE_DUCK_ATTACK_MS = 160;
const VOICE_DUCK_RELEASE_MS = 260;

function mimeToHowlerFormat(mime: string): string[] | undefined {
  const normalized = mime.toLowerCase();
  if (normalized.includes("mpeg") || normalized.includes("mp3")) {
    return ["mp3"];
  }
  if (normalized.includes("wav")) {
    return ["wav"];
  }
  if (normalized.includes("ogg")) {
    return ["ogg"];
  }
  if (normalized.includes("mp4") || normalized.includes("m4a") || normalized.includes("aac")) {
    return ["m4a"];
  }
  return undefined;
}

export type GameSfxKey = AudioSfxId | string;
export type GameBedKey = AudioBedId | string;
export type GameBgmKey = GameBedKey;
export type { AudioBedKind };

export interface AudioPlaybackSnapshot {
  readonly muted: boolean;
  readonly unlocked: boolean;
  readonly cutscenePaused: boolean;
  readonly duckOwner: AudioDuckOwner;
  readonly musicKey: string | null;
  readonly ambientKey: string | null;
  readonly voiceActive: boolean;
}

type NowPlayingListener = (key: string | null) => void;

interface FadingPlayback {
  readonly howl: EngineHowl;
  readonly cancel: CancelEngineFade;
}

export function isSceneCueSfx(key: string | null | undefined): boolean {
  return resolveSfxCatalogEntry(key)?.sceneCue ?? false;
}

export function classifyBed(key: string | null | undefined): AudioBedKind | null {
  return resolveBedCatalogEntry(key)?.kind ?? null;
}

export class GameAudioController {
  private muted = false;
  private unlocked = false;
  private cutscenePaused = false;
  private voiceActive = false;

  private musicVolume = 0.42;
  private ambientVolume = 0.28;
  private sfxVolume = 0.72;
  private voiceVolume = 0.8;
  private reverbAmount = 0.28;

  private musicHowl: EngineHowl | null = null;
  private musicKey: string | null = null;
  private musicFadingOut: FadingPlayback | null = null;

  private ambientHowl: EngineHowl | null = null;
  private ambientKey: string | null = null;
  private ambientFadingOut: FadingPlayback | null = null;

  private voiceHowl: EngineHowl | null = null;
  private voiceObjectUrl: string | null = null;

  private readonly nowPlayingListeners = new Set<NowPlayingListener>();
  private readonly sfxCache = new Map<string, EngineHowl>();

  isMuted(): boolean {
    return this.muted;
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }

  getAmbientVolume(): number {
    return this.ambientVolume;
  }

  getSfxVolume(): number {
    return this.sfxVolume;
  }

  getVoiceVolume(): number {
    return this.voiceVolume;
  }

  getReverbAmount(): number {
    return this.reverbAmount;
  }

  getBgmVolume(): number {
    return this.musicVolume;
  }

  getPlaybackSnapshot(): AudioPlaybackSnapshot {
    return {
      muted: this.muted,
      unlocked: this.unlocked,
      cutscenePaused: this.cutscenePaused,
      duckOwner: this.resolveMix().duckOwner,
      musicKey: this.musicKey,
      ambientKey: this.ambientKey,
      voiceActive: this.voiceActive,
    };
  }

  setMusicVolume(next: number): void {
    this.musicVolume = clamp01(next);
    this.applyBedMix();
  }

  setAmbientVolume(next: number): void {
    this.ambientVolume = clamp01(next);
    this.applyBedMix();
  }

  setSfxVolume(next: number): void {
    this.sfxVolume = clamp01(next);
  }

  setVoiceVolume(next: number): void {
    this.voiceVolume = clamp01(next);
    if (this.voiceVolume === 0) {
      this.stopVoice();
      return;
    }
    this.voiceHowl?.volume(this.resolveMix().voice);
  }

  setReverbAmount(next: number): void {
    this.reverbAmount = clamp01(next);
    setGlobalReverbWet(this.reverbAmount);
  }

  setBgmVolume(next: number): void {
    this.setMusicVolume(next);
  }

  setMuted(next: boolean): void {
    this.muted = next;
    setHowlerMasterMute(next);
    if (next) {
      this.stopVoice();
      this.cancelFadingBeds();
      this.musicHowl?.pause();
      this.ambientHowl?.pause();
      return;
    }
    this.applyBedMix();
    this.resumeBedsIfAllowed();
  }

  unlock(): void {
    this.unlocked = true;
    unlockHowler();
    // Re-assert product mute after context unlock; unlock must never unmute.
    setHowlerMasterMute(this.muted);
    setGlobalReverbWet(this.reverbAmount);
    this.applyBedMix();
    this.resumeBedsIfAllowed();
  }

  preload(): void {
    for (const entry of AUDIO_BED_CATALOG) {
      createEngineHowl({ src: entry.src, volume: 0, loop: true }).unload();
    }
    for (const entry of AUDIO_SFX_CATALOG) {
      createEngineHowl({ src: entry.src, volume: 0, loop: false }).unload();
    }
  }

  stopVoice(): void {
    const hadActiveVoice = this.voiceActive || Boolean(this.voiceHowl || this.voiceObjectUrl);
    stopAndUnload(this.voiceHowl);
    this.voiceHowl = null;
    if (this.voiceObjectUrl) {
      URL.revokeObjectURL(this.voiceObjectUrl);
      this.voiceObjectUrl = null;
    }
    this.voiceActive = false;
    if (hadActiveVoice) {
      this.applyBedMix(VOICE_DUCK_RELEASE_MS);
    }
  }

  playVoiceFromBase64(
    base64: string,
    mimeType = "audio/mpeg",
    options?: { speaker?: string; side?: "left" | "right" | "center" },
  ): boolean {
    this.unlock();
    this.stopVoice();
    if (this.muted || this.voiceVolume === 0 || !base64) {
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
      this.voiceObjectUrl = objectUrl;
      const pan = panForSpeaker(options?.speaker ?? "", options?.side);
      let howl: EngineHowl | null = null;
      const release = () => {
        // Owner-safe: only tear down if this attempt still owns the URL/howl.
        // Covers immediate construct errors before `this.voiceHowl` is assigned.
        if (this.voiceObjectUrl === objectUrl || (howl !== null && this.voiceHowl === howl)) {
          this.stopVoice();
        }
      };
      howl = createEngineHowl({
        src: objectUrl,
        loop: false,
        volume: this.resolveMix().voice,
        pan,
        reverb: this.reverbAmount * 0.65,
        html5: false,
        format,
        onend: release,
        onloaderror: release,
        onplayerror: release,
      });
      // Sync onloaderror may have already released URL/duck via `release`.
      if (this.voiceObjectUrl !== objectUrl) {
        stopAndUnload(howl);
        return false;
      }
      this.voiceHowl = howl;
      this.voiceActive = true;
      this.applyBedMix(VOICE_DUCK_ATTACK_MS);
      howl.play();
      return true;
    } catch {
      this.stopVoice();
      return false;
    }
  }

  playSfx(key: GameSfxKey | null | undefined, volume = 0.7): void {
    const entry = resolveSfxCatalogEntry(key);
    if (!entry || this.muted || this.sfxVolume === 0) {
      return;
    }

    let howl = this.sfxCache.get(entry.id);
    if (!howl) {
      let created: EngineHowl;
      const releaseFailed = () => {
        if (this.sfxCache.get(entry.id) === created) {
          this.sfxCache.delete(entry.id);
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
      this.sfxCache.set(entry.id, howl);
    }
    if (entry.repeat === "restart" && howl.playing()) {
      howl.stop();
    }
    howl.volume(clamp01(volume * this.sfxVolume));
    howl.play();
  }

  playExclusiveBed(key: GameBedKey | null | undefined): void {
    const entry = resolveBedCatalogEntry(key);
    if (!entry) {
      this.fadeStopMusic();
      this.fadeStopAmbient();
      return;
    }
    if (entry.kind === "music") {
      this.fadeStopAmbient(false);
      this.playMusicEntry(entry);
    } else {
      this.fadeStopMusic(false);
      this.playAmbientEntry(entry);
    }
    this.emitNowPlaying();
  }

  playBed(key: GameBedKey | null | undefined): void {
    const entry = resolveBedCatalogEntry(key);
    if (!entry) {
      return;
    }
    if (entry.kind === "music") {
      this.playMusicEntry(entry);
    } else {
      this.playAmbientEntry(entry);
    }
    this.emitNowPlaying();
  }

  playBgm(key: GameBedKey | null | undefined): void {
    if (!key) {
      this.fadeStopMusic();
      this.fadeStopAmbient();
      return;
    }
    this.playExclusiveBed(key);
  }

  playMusic(key: GameBedKey | null | undefined): void {
    const entry = resolveBedCatalogEntry(key);
    if (!entry || entry.kind !== "music") {
      this.fadeStopMusic();
      return;
    }
    this.playMusicEntry(entry);
    this.emitNowPlaying();
  }

  playAmbient(key: GameBedKey | null | undefined): void {
    const entry = resolveBedCatalogEntry(key);
    if (!entry || entry.kind !== "ambient") {
      this.fadeStopAmbient();
      return;
    }
    this.playAmbientEntry(entry);
    this.emitNowPlaying();
  }

  previewMusic(): void {
    if (!this.musicKey) {
      this.playMusic("title-theme");
      return;
    }
    this.resumeBedsIfAllowed();
  }

  previewAmbient(): void {
    if (!this.ambientKey) {
      this.playAmbient("night-ambient");
      return;
    }
    this.resumeBedsIfAllowed();
  }

  pauseBedsForCutscene(): void {
    if (this.cutscenePaused) {
      return;
    }
    this.cutscenePaused = true;
    this.cancelFadingBeds();
    this.musicHowl?.pause();
    this.ambientHowl?.pause();
  }

  resumeBedsAfterCutscene(): void {
    if (!this.cutscenePaused) {
      return;
    }
    this.cutscenePaused = false;
    this.applyBedMix();
    this.resumeBedsIfAllowed();
  }

  pauseBgmForCutscene(): void {
    this.pauseBedsForCutscene();
  }

  resumeBgmAfterCutscene(): void {
    this.resumeBedsAfterCutscene();
  }

  stopMusic(): void {
    this.clearMusicFadingOut();
    stopAndUnload(this.musicHowl);
    this.musicHowl = null;
    this.musicKey = null;
    this.emitNowPlaying();
  }

  stopAmbient(): void {
    this.clearAmbientFadingOut();
    stopAndUnload(this.ambientHowl);
    this.ambientHowl = null;
    this.ambientKey = null;
    this.emitNowPlaying();
  }

  stopSfx(): void {
    for (const howl of this.sfxCache.values()) {
      stopAndUnload(howl);
    }
    this.sfxCache.clear();
  }

  stopBgm(): void {
    this.stopMusic();
    this.stopAmbient();
  }

  stopAll(): void {
    this.stopVoice();
    this.stopBgm();
    this.stopSfx();
    this.cutscenePaused = false;
  }

  currentMusic(): string | null {
    return this.musicKey;
  }

  currentAmbient(): string | null {
    return this.ambientKey;
  }

  getNowPlayingKey(): string | null {
    return this.musicKey ?? this.ambientKey;
  }

  onNowPlayingChange(listener: NowPlayingListener): () => void {
    this.nowPlayingListeners.add(listener);
    listener(this.getNowPlayingKey());
    return () => {
      this.nowPlayingListeners.delete(listener);
    };
  }

  private resolveMix() {
    return resolveAudioMixGains({
      state: {
        muted: this.muted,
        unlocked: this.unlocked,
        cutscenePaused: this.cutscenePaused,
        voiceActive: this.voiceActive,
      },
      musicVolume: this.musicVolume,
      ambientVolume: this.ambientVolume,
      voiceVolume: this.voiceVolume,
    });
  }

  private applyBedMix(durationMs = 0): void {
    const mix = this.resolveMix();
    this.setHowlVolume(this.musicHowl, mix.music, durationMs);
    this.setHowlVolume(this.ambientHowl, mix.ambient, durationMs);
  }

  private setHowlVolume(howl: EngineHowl | null, target: number, durationMs: number): void {
    if (!howl) {
      return;
    }
    if (durationMs > 0 && howl.playing()) {
      fadeHowl(howl, howl.volume(), target, durationMs);
      return;
    }
    howl.volume(target);
  }

  private resumeBedsIfAllowed(): void {
    const mix = this.resolveMix();
    if (!mix.bedsShouldPlay) {
      return;
    }
    if (this.musicHowl && !this.musicHowl.playing()) {
      this.musicHowl.volume(mix.music);
      this.musicHowl.play();
    }
    if (this.ambientHowl && !this.ambientHowl.playing()) {
      this.ambientHowl.volume(mix.ambient);
      this.ambientHowl.play();
    }
  }

  private playMusicEntry(entry: AudioBedCatalogEntry): void {
    if (this.musicKey === entry.id && this.musicHowl) {
      this.musicHowl.volume(this.resolveMix().music);
      this.resumeBedsIfAllowed();
      return;
    }
    this.clearMusicFadingOut();
    const previous = this.musicHowl;
    let next: EngineHowl | null = null;
    const releaseFailed = () => {
      // Only clear if this instance is still the music owner (never clobber a newer Howl).
      if (next && this.musicHowl === next && this.musicKey === entry.id) {
        stopAndUnload(next);
        this.musicHowl = null;
        this.musicKey = null;
        this.emitNowPlaying();
      }
    };
    next = createEngineHowl({
      src: entry.src,
      loop: true,
      volume: 0,
      reverb: this.reverbAmount,
      onloaderror: releaseFailed,
      onplayerror: releaseFailed,
    });
    this.musicHowl = next;
    this.musicKey = entry.id;
    const mix = this.resolveMix();
    if (mix.bedsShouldPlay) {
      next.play();
      fadeHowl(next, 0, mix.music, entry.fadeInMs);
    } else {
      next.volume(mix.music);
    }
    if (previous) {
      this.fadeOutMusicHowl(previous, entry.fadeOutMs);
    }
  }

  private playAmbientEntry(entry: AudioBedCatalogEntry): void {
    if (this.ambientKey === entry.id && this.ambientHowl) {
      this.ambientHowl.volume(this.resolveMix().ambient);
      this.resumeBedsIfAllowed();
      return;
    }
    this.clearAmbientFadingOut();
    const previous = this.ambientHowl;
    let next: EngineHowl | null = null;
    const releaseFailed = () => {
      if (next && this.ambientHowl === next && this.ambientKey === entry.id) {
        stopAndUnload(next);
        this.ambientHowl = null;
        this.ambientKey = null;
        this.emitNowPlaying();
      }
    };
    next = createEngineHowl({
      src: entry.src,
      loop: true,
      volume: 0,
      reverb: this.reverbAmount,
      onloaderror: releaseFailed,
      onplayerror: releaseFailed,
    });
    this.ambientHowl = next;
    this.ambientKey = entry.id;
    const mix = this.resolveMix();
    if (mix.bedsShouldPlay) {
      next.play();
      fadeHowl(next, 0, mix.ambient, entry.fadeInMs);
    } else {
      next.volume(mix.ambient);
    }
    if (previous) {
      this.fadeOutAmbientHowl(previous, entry.fadeOutMs);
    }
  }

  private fadeStopMusic(emit = true): void {
    const howl = this.musicHowl;
    const entry = resolveBedCatalogEntry(this.musicKey);
    this.musicHowl = null;
    this.musicKey = null;
    if (howl) {
      this.fadeOutMusicHowl(howl, entry?.fadeOutMs ?? 700);
    }
    if (emit) {
      this.emitNowPlaying();
    }
  }

  private fadeStopAmbient(emit = true): void {
    const howl = this.ambientHowl;
    const entry = resolveBedCatalogEntry(this.ambientKey);
    this.ambientHowl = null;
    this.ambientKey = null;
    if (howl) {
      this.fadeOutAmbientHowl(howl, entry?.fadeOutMs ?? 700);
    }
    if (emit) {
      this.emitNowPlaying();
    }
  }

  private fadeOutMusicHowl(howl: EngineHowl, durationMs: number): void {
    this.clearMusicFadingOut();
    if (!howl.playing() || this.muted || this.cutscenePaused) {
      stopAndUnload(howl);
      return;
    }
    const cancel = fadeHowl(howl, howl.volume(), 0, durationMs, () => {
      if (this.musicFadingOut?.howl === howl) {
        stopAndUnload(howl);
        this.musicFadingOut = null;
      }
    });
    this.musicFadingOut = { howl, cancel };
  }

  private fadeOutAmbientHowl(howl: EngineHowl, durationMs: number): void {
    this.clearAmbientFadingOut();
    if (!howl.playing() || this.muted || this.cutscenePaused) {
      stopAndUnload(howl);
      return;
    }
    const cancel = fadeHowl(howl, howl.volume(), 0, durationMs, () => {
      if (this.ambientFadingOut?.howl === howl) {
        stopAndUnload(howl);
        this.ambientFadingOut = null;
      }
    });
    this.ambientFadingOut = { howl, cancel };
  }

  private clearMusicFadingOut(): void {
    if (!this.musicFadingOut) {
      return;
    }
    this.musicFadingOut.cancel();
    stopAndUnload(this.musicFadingOut.howl);
    this.musicFadingOut = null;
  }

  private clearAmbientFadingOut(): void {
    if (!this.ambientFadingOut) {
      return;
    }
    this.ambientFadingOut.cancel();
    stopAndUnload(this.ambientFadingOut.howl);
    this.ambientFadingOut = null;
  }

  private cancelFadingBeds(): void {
    this.clearMusicFadingOut();
    this.clearAmbientFadingOut();
  }

  private emitNowPlaying(): void {
    const key = this.getNowPlayingKey();
    for (const listener of this.nowPlayingListeners) {
      listener(key);
    }
  }
}

export const gameAudio = new GameAudioController();
