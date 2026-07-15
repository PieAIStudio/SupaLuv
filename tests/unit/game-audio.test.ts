import { beforeEach, describe, expect, it, vi } from "vitest";

const engine = vi.hoisted(() => {
  class FakeHowl {
    readonly options: Record<string, unknown>;
    volumeValue = 0;
    playingValue = false;
    playCalls = 0;
    pauseCalls = 0;
    stopCalls = 0;
    unloadCalls = 0;

    constructor(options: Record<string, unknown>) {
      this.options = options;
      this.volumeValue = typeof options.volume === "number" ? options.volume : 1;
    }

    play() {
      this.playingValue = true;
      this.playCalls += 1;
      return 1;
    }

    pause() {
      this.playingValue = false;
      this.pauseCalls += 1;
      return this;
    }

    stop() {
      this.playingValue = false;
      this.stopCalls += 1;
      return this;
    }

    unload() {
      this.playingValue = false;
      this.unloadCalls += 1;
    }

    playing() {
      return this.playingValue;
    }

    volume(next?: number) {
      if (typeof next === "number") {
        this.volumeValue = next;
        return this;
      }
      return this.volumeValue;
    }
  }

  const howls: FakeHowl[] = [];
  const createEngineHowl = vi.fn((options: Record<string, unknown>) => {
    const howl = new FakeHowl(options);
    howls.push(howl);
    return howl;
  });
  const fadeHowl = vi.fn((howl: FakeHowl, _from: number, to: number) => {
    howl.volume(to);
    return vi.fn();
  });
  return {
    FakeHowl,
    howls,
    createEngineHowl,
    fadeHowl,
    panForSpeaker: vi.fn(() => 0),
    setGlobalReverbWet: vi.fn(),
    setHowlerMasterMute: vi.fn(),
    unlockHowler: vi.fn(),
    stopAndUnload: vi.fn((howl: FakeHowl | null | undefined) => {
      howl?.stop();
      howl?.unload();
    }),
  };
});

vi.mock("../../apps/web/src/audio/howlerEngine", () => ({
  createEngineHowl: engine.createEngineHowl,
  fadeHowl: engine.fadeHowl,
  panForSpeaker: engine.panForSpeaker,
  setGlobalReverbWet: engine.setGlobalReverbWet,
  setHowlerMasterMute: engine.setHowlerMasterMute,
  stopAndUnload: engine.stopAndUnload,
  unlockHowler: engine.unlockHowler,
}));

import {
  GameAudioController,
  classifyBed,
  isSceneCueSfx,
} from "../../apps/web/src/audio/gameAudio";
import { VOICE_AMBIENT_DUCK, resolveAudioMixGains } from "../../apps/web/src/audio/audioMixState";

describe("gameAudio catalog and mix policy", () => {
  beforeEach(() => {
    engine.howls.length = 0;
    vi.clearAllMocks();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:supaluv-voice"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("classifies stable music and ambient IDs without inventing missing assets", () => {
    expect(classifyBed("soft-piano")).toBe("music");
    expect(classifyBed("chapter-end")).toBe("music");
    expect(classifyBed("night-ambient")).toBe("ambient");
    expect(classifyBed("lonely-pad")).toBe("ambient");
    expect(classifyBed("missing-bed")).toBeNull();
  });

  it("keeps scene cue SFX separate from UI repetition", () => {
    expect(isSceneCueSfx("notify-soft")).toBe(true);
    expect(isSceneCueSfx("payment-chime")).toBe(true);
    expect(isSceneCueSfx("ui-click")).toBe(false);
    expect(isSceneCueSfx("missing-sfx")).toBe(false);
  });

  it("has one explainable duck owner and lets mute/cutscene pause win", () => {
    expect(
      resolveAudioMixGains({
        state: { muted: false, unlocked: true, cutscenePaused: false, voiceActive: true },
        musicVolume: 0.5,
        ambientVolume: 0.4,
        voiceVolume: 0.8,
      }),
    ).toMatchObject({ duckOwner: "voice", bedsShouldPlay: true });
    expect(
      resolveAudioMixGains({
        state: { muted: true, unlocked: true, cutscenePaused: false, voiceActive: true },
        musicVolume: 0.5,
        ambientVolume: 0.4,
        voiceVolume: 0.8,
      }),
    ).toMatchObject({ duckOwner: null, bedsShouldPlay: false, voice: 0 });
    expect(
      resolveAudioMixGains({
        state: { muted: false, unlocked: true, cutscenePaused: true, voiceActive: false },
        musicVolume: 0.5,
        ambientVolume: 0.4,
        voiceVolume: 0.8,
      }).bedsShouldPlay,
    ).toBe(false);
  });

  it("routes exclusive ambient beds to the ambient bus and does not restart repeats", () => {
    const controller = new GameAudioController();
    controller.unlock();
    controller.playExclusiveBed("night-ambient");
    const ambient = engine.howls[0];

    expect(controller.getPlaybackSnapshot()).toMatchObject({
      musicKey: null,
      ambientKey: "night-ambient",
    });
    expect(ambient?.playCalls).toBe(1);

    controller.playExclusiveBed("night-ambient");
    expect(engine.createEngineHowl).toHaveBeenCalledOnce();
    expect(ambient?.playCalls).toBe(1);
  });

  it("ducks and restores the active bed around voice, then unloads voice idempotently", () => {
    const controller = new GameAudioController();
    controller.unlock();
    controller.playExclusiveBed("night-ambient");
    const ambient = engine.howls[0];

    expect(controller.playVoiceFromBase64("YQ==", "audio/mpeg", { speaker: "雷欧" })).toBe(true);
    const voice = engine.howls[1];
    expect(controller.getPlaybackSnapshot()).toMatchObject({
      duckOwner: "voice",
      voiceActive: true,
    });
    expect(ambient?.volumeValue).toBeCloseTo(0.28 * VOICE_AMBIENT_DUCK);

    controller.stopVoice();
    controller.stopVoice();
    expect(controller.getPlaybackSnapshot()).toMatchObject({
      duckOwner: null,
      voiceActive: false,
    });
    expect(ambient?.volumeValue).toBeCloseTo(0.28);
    expect(voice?.stopCalls).toBe(1);
    expect(voice?.unloadCalls).toBe(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce();
  });

  it("stops voice on mute and restores only beds after unmute", () => {
    const controller = new GameAudioController();
    controller.unlock();
    controller.playExclusiveBed("soft-piano");
    const music = engine.howls[0];
    controller.playVoiceFromBase64("YQ==");
    const voice = engine.howls[1];

    controller.setMuted(true);
    controller.setMuted(false);

    expect(controller.getPlaybackSnapshot().voiceActive).toBe(false);
    expect(voice?.unloadCalls).toBe(1);
    expect(music?.pauseCalls).toBe(1);
    expect(music?.playCalls).toBe(2);
  });

  it("makes cutscene pause/resume idempotent", () => {
    const controller = new GameAudioController();
    controller.unlock();
    controller.playExclusiveBed("soft-piano");
    const music = engine.howls[0];

    controller.pauseBedsForCutscene();
    controller.pauseBedsForCutscene();
    controller.resumeBedsAfterCutscene();
    controller.resumeBedsAfterCutscene();

    expect(music?.pauseCalls).toBe(1);
    expect(music?.playCalls).toBe(2);
    expect(controller.getPlaybackSnapshot().cutscenePaused).toBe(false);
  });

  it("restarts cinematic SFX but permits overlapping UI SFX", () => {
    const controller = new GameAudioController();
    controller.playSfx("notify-soft");
    controller.playSfx("notify-soft");
    const notify = engine.howls[0];
    expect(notify?.stopCalls).toBe(1);
    expect(notify?.playCalls).toBe(2);

    controller.playSfx("ui-click");
    controller.playSfx("ui-click");
    const click = engine.howls[1];
    expect(click?.stopCalls).toBe(0);
    expect(click?.playCalls).toBe(2);
  });

  it("drops failed cached SFX so a retry creates a fresh playable object", () => {
    const controller = new GameAudioController();
    controller.playSfx("notify-soft");
    const failed = engine.howls[0];
    const onloaderror = failed?.options.onloaderror;
    expect(typeof onloaderror).toBe("function");
    if (typeof onloaderror === "function") {
      onloaderror();
    }

    controller.playSfx("notify-soft");
    expect(engine.createEngineHowl).toHaveBeenCalledTimes(2);
    expect(failed?.unloadCalls).toBe(1);
  });

  it("clears failed music/ambient beds so the same id can retry with a new Howl", () => {
    const controller = new GameAudioController();
    controller.unlock();
    controller.playExclusiveBed("soft-piano");
    const failedMusic = engine.howls[0];
    const musicError = failedMusic?.options.onloaderror;
    expect(typeof musicError).toBe("function");
    if (typeof musicError === "function") {
      musicError();
    }
    expect(controller.getPlaybackSnapshot().musicKey).toBeNull();
    expect(failedMusic?.unloadCalls).toBe(1);

    controller.playExclusiveBed("soft-piano");
    expect(engine.createEngineHowl).toHaveBeenCalledTimes(2);
    expect(controller.getPlaybackSnapshot().musicKey).toBe("soft-piano");

    controller.playExclusiveBed("night-ambient");
    const failedAmbient = engine.howls[2];
    const ambientError = failedAmbient?.options.onplayerror;
    expect(typeof ambientError).toBe("function");
    if (typeof ambientError === "function") {
      ambientError();
    }
    expect(controller.getPlaybackSnapshot().ambientKey).toBeNull();
    controller.playExclusiveBed("night-ambient");
    expect(controller.getPlaybackSnapshot().ambientKey).toBe("night-ambient");
  });

  it("does not clear a newer bed Howl when a superseded instance fails late", () => {
    const controller = new GameAudioController();
    controller.unlock();
    controller.playExclusiveBed("soft-piano");
    const first = engine.howls[0];
    controller.playExclusiveBed("chapter-end");
    const second = engine.howls[1];
    const lateError = first?.options.onloaderror;
    if (typeof lateError === "function") {
      lateError();
    }
    expect(controller.getPlaybackSnapshot().musicKey).toBe("chapter-end");
    expect(second?.unloadCalls).toBe(0);
  });

  it("keeps product mute after unlock and never unmutes via context unlock", () => {
    const controller = new GameAudioController();
    controller.setMuted(true);
    engine.setHowlerMasterMute.mockClear();
    engine.unlockHowler.mockClear();

    controller.unlock();

    expect(engine.unlockHowler).toHaveBeenCalledOnce();
    expect(engine.setHowlerMasterMute).toHaveBeenCalledWith(true);
    expect(controller.isMuted()).toBe(true);
    expect(controller.getPlaybackSnapshot().muted).toBe(true);
  });

  it("releases voice object URL, voiceActive, and duck on immediate Howl error", () => {
    const controller = new GameAudioController();
    controller.unlock();
    controller.playExclusiveBed("night-ambient");
    const ambient = engine.howls[0];

    engine.createEngineHowl.mockImplementationOnce((options: Record<string, unknown>) => {
      const howl = new engine.FakeHowl(options);
      engine.howls.push(howl);
      if (typeof options.onloaderror === "function") {
        options.onloaderror();
      }
      return howl;
    });

    expect(controller.playVoiceFromBase64("YQ==", "audio/mpeg")).toBe(false);
    expect(controller.getPlaybackSnapshot()).toMatchObject({
      voiceActive: false,
      duckOwner: null,
    });
    expect(URL.revokeObjectURL).toHaveBeenCalled();
    expect(ambient?.volumeValue).toBeCloseTo(0.28);
  });

  it("stops voice when voice volume reaches zero", () => {
    const controller = new GameAudioController();
    controller.unlock();
    controller.playVoiceFromBase64("YQ==");
    const voice = engine.howls[0];
    controller.setVoiceVolume(0);
    expect(controller.getPlaybackSnapshot().voiceActive).toBe(false);
    expect(voice?.unloadCalls).toBe(1);
  });

  it("switches sequence beds across channels without leaving the prior layer current", () => {
    const controller = new GameAudioController();
    controller.unlock();
    controller.playExclusiveBed("night-ambient");
    controller.playExclusiveBed("chapter-end");

    expect(controller.getPlaybackSnapshot()).toMatchObject({
      musicKey: "chapter-end",
      ambientKey: null,
    });
  });

  it("ignores unknown catalog IDs without creating Howls or URLs", () => {
    const controller = new GameAudioController();
    controller.playExclusiveBed("not-authored");
    controller.playSfx("not-authored");
    expect(engine.createEngineHowl).not.toHaveBeenCalled();
  });
});
