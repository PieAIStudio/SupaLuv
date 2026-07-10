/**
 * Four-channel audio façade (VN commercial layout).
 * Backend: Howler + reverb bus (see howlerEngine.ts).
 *
 * - music: exclusive melodic bed with crossfade
 * - ambient: reserved for true pads (currently unused; Lyria beds are exclusive music)
 * - sfx: one-shots
 * - voice: TTS / VO with stereo pan
 */

import { Howl } from "howler";
import {
  createEngineHowl,
  fadeHowl,
  panForSpeaker,
  setGlobalReverbWet,
  setHowlerMasterMute,
  stopAndUnload,
  unlockHowler,
} from "./howlerEngine";

function mimeToHowlerFormat(mime: string): string[] | undefined {
  const m = mime.toLowerCase();
  if (m.includes("mpeg") || m.includes("mp3")) {
    return ["mp3"];
  }
  if (m.includes("wav")) {
    return ["wav"];
  }
  if (m.includes("ogg")) {
    return ["ogg"];
  }
  if (m.includes("mp4") || m.includes("m4a") || m.includes("aac")) {
    return ["m4a"];
  }
  // MiniMax often returns mpeg; default helps blob: URLs.
  return ["mp3"];
}

type SfxId = "ui-click" | "ui-choice" | "notify-soft" | "payment-chime";
type BedId = "title-theme" | "soft-piano" | "chapter-end" | "night-ambient" | "lonely-pad";

const SFX_PATH: Record<SfxId, string> = {
  "ui-click": "/assets/audio/sfx/ui-click.mp3",
  "ui-choice": "/assets/audio/sfx/ui-choice.mp3",
  "notify-soft": "/assets/audio/sfx/notify-soft.mp3",
  "payment-chime": "/assets/audio/sfx/payment-chime.mp3",
};

const BED_PATH: Record<BedId, string> = {
  "title-theme": "/assets/audio/bgm/title-theme.mp3",
  "soft-piano": "/assets/audio/bgm/soft-piano.mp3",
  "chapter-end": "/assets/audio/bgm/chapter-end.mp3",
  "night-ambient": "/assets/audio/bgm/night-ambient.mp3",
  "lonely-pad": "/assets/audio/bgm/lonely-pad.mp3",
};

const MUSIC_KEYS = new Set<string>([
  "title-theme",
  "soft-piano",
  "chapter-end",
  "night-ambient",
  "lonely-pad",
]);
const SCENE_CUE_SFX = new Set<string>(["notify-soft", "payment-chime"]);
const MUSIC_CROSSFADE_MS = 700;

export type GameSfxKey = SfxId | string;
export type GameBedKey = BedId | string;
export type GameBgmKey = GameBedKey;
export type AudioBedKind = "music" | "ambient";

export function isSceneCueSfx(key: string | null | undefined): boolean {
  return Boolean(key && SCENE_CUE_SFX.has(key));
}

export function classifyBed(key: string): AudioBedKind {
  if (MUSIC_KEYS.has(key)) {
    return "music";
  }
  return "music";
}

type NowPlayingListener = (key: string | null) => void;

class GameAudioController {
  private muted = false;
  private unlocked = false;
  private musicVolume = 0.42;
  private ambientVolume = 0.28;
  private sfxVolume = 0.72;
  private voiceVolume = 0.8;
  private reverbAmount = 0.28;

  private musicHowl: Howl | null = null;
  private musicKey: string | null = null;
  private musicPausedForCutscene = false;
  private fadingOut: Howl | null = null;

  private ambientHowl: Howl | null = null;
  private ambientKey: string | null = null;

  private voiceHowl: Howl | null = null;
  private voiceObjectUrl: string | null = null;

  private readonly nowPlayingListeners = new Set<NowPlayingListener>();
  private readonly sfxCache = new Map<string, Howl>();

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

  setMusicVolume(next: number): void {
    this.musicVolume = clamp01(next);
    if (this.musicHowl && !this.musicPausedForCutscene) {
      this.musicHowl.volume(this.musicVolume);
    }
  }

  setAmbientVolume(next: number): void {
    this.ambientVolume = clamp01(next);
    this.ambientHowl?.volume(this.ambientVolume);
  }

  setSfxVolume(next: number): void {
    this.sfxVolume = clamp01(next);
  }

  setVoiceVolume(next: number): void {
    this.voiceVolume = clamp01(next);
    this.voiceHowl?.volume(this.voiceVolume);
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
      this.musicHowl?.pause();
      this.ambientHowl?.pause();
      this.voiceHowl?.pause();
    } else if (this.unlocked) {
      if (this.musicHowl && !this.musicPausedForCutscene) {
        this.musicHowl.play();
      }
      this.ambientHowl?.play();
    }
  }

  unlock(): void {
    this.unlocked = true;
    unlockHowler();
    setGlobalReverbWet(this.reverbAmount);
    if (!this.muted && this.musicHowl && !this.musicPausedForCutscene) {
      this.musicHowl.play();
    }
  }

  preload(): void {
    for (const path of Object.values(BED_PATH)) {
      createEngineHowl({ src: path, volume: 0, loop: true }).unload();
    }
  }

  stopVoice(): void {
    stopAndUnload(this.voiceHowl);
    this.voiceHowl = null;
    if (this.voiceObjectUrl) {
      URL.revokeObjectURL(this.voiceObjectUrl);
      this.voiceObjectUrl = null;
    }
  }

  playVoiceFromBase64(
    base64: string,
    mimeType = "audio/mpeg",
    options?: { speaker?: string; side?: "left" | "right" | "center" },
  ): void {
    // Voice is always triggered from a user gesture path (settings / line advance) —
    // unlock here so we never load audio then refuse to play.
    this.unlock();
    if (this.muted || !base64) {
      return;
    }
    this.stopVoice();
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const safeMime = mimeType || "audio/mpeg";
      const blob = new Blob([bytes], { type: safeMime });
      const url = URL.createObjectURL(blob);
      this.voiceObjectUrl = url;
      const pan = panForSpeaker(options?.speaker ?? "", options?.side);
      // Howler needs an extension/format hint for blob: URLs.
      const format = mimeToHowlerFormat(safeMime);
      const howl = createEngineHowl({
        src: url,
        loop: false,
        volume: Math.max(0.05, this.voiceVolume),
        pan,
        reverb: this.reverbAmount * 0.65,
        html5: false,
        format,
        onend: () => {
          if (this.voiceHowl === howl) {
            this.stopVoice();
          }
        },
      });
      this.voiceHowl = howl;
      howl.once("loaderror", () => {
        if (this.voiceHowl === howl) {
          this.stopVoice();
        }
      });
      howl.play();
    } catch {
      // subtitle-only
    }
  }

  playSfx(key: GameSfxKey | null | undefined, volume = 0.7): void {
    if (!key || this.muted) {
      return;
    }
    const path = SFX_PATH[key as SfxId] ?? `/assets/audio/sfx/${key}.mp3`;
    let howl = this.sfxCache.get(path);
    if (!howl) {
      howl = createEngineHowl({ src: path, loop: false, volume: 1, reverb: 0.08 });
      this.sfxCache.set(path, howl);
    }
    howl.volume(clamp01(volume * this.sfxVolume));
    howl.play();
  }

  playExclusiveBed(key: GameBedKey | null | undefined): void {
    this.stopAmbient();
    this.playMusic(key);
  }

  playBed(key: GameBedKey | null | undefined): void {
    if (!key) {
      return;
    }
    if (classifyBed(key) === "music") {
      this.playMusic(key);
      return;
    }
    this.playAmbient(key);
  }

  playBgm(key: GameBedKey | null | undefined): void {
    if (!key) {
      this.stopMusic();
      this.stopAmbient();
      return;
    }
    this.playExclusiveBed(key);
  }

  playMusic(key: GameBedKey | null | undefined): void {
    if (!key) {
      this.fadeStopMusic();
      return;
    }
    if (this.musicKey === key && this.musicHowl) {
      this.musicHowl.volume(this.musicVolume);
      if (this.unlocked && !this.muted && !this.musicPausedForCutscene) {
        if (!this.musicHowl.playing()) {
          this.musicHowl.play();
        }
      }
      this.emitNowPlaying();
      return;
    }

    const path = BED_PATH[key as BedId] ?? `/assets/audio/bgm/${key}.mp3`;
    const previous = this.musicHowl;
    const next = createEngineHowl({
      src: path,
      loop: true,
      volume: previous ? 0 : this.musicVolume,
      reverb: this.reverbAmount,
    });

    this.musicHowl = next;
    this.musicKey = key;
    this.musicPausedForCutscene = false;
    this.emitNowPlaying();

    if (this.unlocked && !this.muted) {
      next.play();
    }

    if (previous) {
      fadeHowl(previous, previous.volume(), 0, MUSIC_CROSSFADE_MS, () => {
        stopAndUnload(previous);
        if (this.fadingOut === previous) {
          this.fadingOut = null;
        }
      });
      this.fadingOut = previous;
      fadeHowl(next, 0, this.musicVolume, MUSIC_CROSSFADE_MS);
    }
  }

  playAmbient(key: GameBedKey | null | undefined): void {
    // Reserved: true pads only. Current content uses exclusive music beds.
    if (!key) {
      this.stopAmbient();
      return;
    }
    // Route ambient-named keys through exclusive music to avoid dual full mixes.
    this.playExclusiveBed(key);
  }

  previewMusic(): void {
    if (!this.musicKey) {
      this.playMusic("title-theme");
    } else if (this.musicHowl && this.unlocked && !this.muted) {
      this.musicHowl.volume(this.musicVolume);
      if (!this.musicHowl.playing()) {
        this.musicHowl.play();
      }
    }
  }

  previewAmbient(): void {
    // Ambient channel currently redirected to exclusive music.
    if (!this.musicKey) {
      this.playMusic("night-ambient");
    }
  }

  pauseBedsForCutscene(): void {
    if (this.musicHowl && !this.musicPausedForCutscene) {
      this.musicPausedForCutscene = true;
      this.musicHowl.pause();
    }
    this.ambientHowl?.pause();
  }

  resumeBedsAfterCutscene(): void {
    if (this.musicPausedForCutscene && this.musicHowl) {
      this.musicPausedForCutscene = false;
      this.musicHowl.volume(this.musicVolume);
      if (this.unlocked && !this.muted) {
        this.musicHowl.play();
      }
    }
  }

  pauseBgmForCutscene(): void {
    this.pauseBedsForCutscene();
  }

  resumeBgmAfterCutscene(): void {
    this.resumeBedsAfterCutscene();
  }

  stopMusic(): void {
    stopAndUnload(this.musicHowl);
    this.musicHowl = null;
    this.musicKey = null;
    this.musicPausedForCutscene = false;
    this.emitNowPlaying();
  }

  stopAmbient(): void {
    stopAndUnload(this.ambientHowl);
    this.ambientHowl = null;
    this.ambientKey = null;
  }

  stopBgm(): void {
    this.stopMusic();
    this.stopAmbient();
  }

  currentMusic(): string | null {
    return this.musicKey;
  }

  currentAmbient(): string | null {
    return this.ambientKey;
  }

  getNowPlayingKey(): string | null {
    return this.musicKey;
  }

  onNowPlayingChange(listener: NowPlayingListener): () => void {
    this.nowPlayingListeners.add(listener);
    listener(this.musicKey);
    return () => {
      this.nowPlayingListeners.delete(listener);
    };
  }

  private fadeStopMusic(): void {
    const howl = this.musicHowl;
    if (!howl) {
      this.stopMusic();
      return;
    }
    fadeHowl(howl, howl.volume(), 0, MUSIC_CROSSFADE_MS, () => {
      if (this.musicHowl === howl) {
        this.stopMusic();
      } else {
        stopAndUnload(howl);
      }
    });
  }

  private emitNowPlaying(): void {
    for (const listener of this.nowPlayingListeners) {
      listener(this.musicKey);
    }
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

export const gameAudio = new GameAudioController();
