/**
 * gameAudio façade tests — grouped by internal facet boundaries:
 * catalog/mix policy · beds · voice+core · sfx
 * (Single file: vitest forbids exporting vi.hoisted engine mocks across files.)
 */
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
  const fades: Array<{
    howl: FakeHowl;
    onDone?: () => void;
    cancelled: boolean;
  }> = [];
  const createEngineHowl = vi.fn((options: Record<string, unknown>) => {
    const howl = new FakeHowl(options);
    howls.push(howl);
    return howl;
  });
  const fadeHowl = vi.fn(
    (howl: FakeHowl, _from: number, to: number, _durationMs: number, onDone?: () => void) => {
      const fade = { howl, onDone, cancelled: false };
      fades.push(fade);
      howl.volume(to);
      return vi.fn(() => {
        fade.cancelled = true;
      });
    },
  );
  return {
    FakeHowl,
    howls,
    fades,
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
import {
  VOICE_AMBIENT_DUCK,
  VOICE_MUSIC_DUCK,
  resolveAudioMixGains,
} from "../../apps/web/src/audio/audioMixState";

function resetEngine(): void {
  engine.howls.length = 0;
  engine.fades.length = 0;
  vi.clearAllMocks();
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:supaluv-voice"),
    revokeObjectURL: vi.fn(),
  });
}

describe("gameAudio catalog and mix policy", () => {
  beforeEach(resetEngine);

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
});

describe("gameAudio beds (dual-track stage music + ambience)", () => {
  beforeEach(resetEngine);

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

  it("starts dedicated music and ambience together and keeps same-key rerenders idempotent", () => {
    const controller = new GameAudioController();
    controller.unlock();

    expect(
      controller.playStageBeds({ musicKey: "soft-piano", ambientKey: "night-ambient" }),
    ).toEqual({
      mode: "dedicated",
      heardBedIds: ["soft-piano", "night-ambient"],
    });
    const music = engine.howls[0];
    const ambient = engine.howls[1];
    expect(controller.getPlaybackSnapshot()).toMatchObject({
      musicKey: "soft-piano",
      ambientKey: "night-ambient",
    });
    expect(music?.playCalls).toBe(1);
    expect(ambient?.playCalls).toBe(1);

    expect(
      controller.playStageBeds({ musicKey: "soft-piano", ambientKey: "night-ambient" }),
    ).toEqual({ mode: "dedicated", heardBedIds: [] });
    expect(engine.createEngineHowl).toHaveBeenCalledTimes(2);
    expect(music?.playCalls).toBe(1);
    expect(ambient?.playCalls).toBe(1);
  });

  it("changes or stops only the requested dedicated bus", () => {
    const controller = new GameAudioController();
    controller.unlock();
    controller.playStageBeds({ musicKey: "soft-piano", ambientKey: "night-ambient" });
    const firstMusic = engine.howls[0];
    const ambient = engine.howls[1];

    controller.playStageBeds({ musicKey: "chapter-end", ambientKey: "night-ambient" });
    expect(controller.getPlaybackSnapshot()).toMatchObject({
      musicKey: "chapter-end",
      ambientKey: "night-ambient",
    });
    expect(engine.createEngineHowl).toHaveBeenCalledTimes(3);
    expect(ambient?.playCalls).toBe(1);
    expect(ambient?.unloadCalls).toBe(0);
    expect(firstMusic?.unloadCalls).toBe(0);

    const chapterMusic = engine.howls[2];
    controller.playStageBeds({ musicKey: "chapter-end", ambientKey: "lonely-pad" });
    expect(controller.getPlaybackSnapshot()).toMatchObject({
      musicKey: "chapter-end",
      ambientKey: "lonely-pad",
    });
    expect(engine.createEngineHowl).toHaveBeenCalledTimes(4);
    expect(chapterMusic?.playCalls).toBe(1);
    expect(chapterMusic?.unloadCalls).toBe(0);

    controller.playStageBeds({ musicKey: null, ambientKey: "lonely-pad" });
    expect(controller.getPlaybackSnapshot()).toMatchObject({
      musicKey: null,
      ambientKey: "lonely-pad",
    });
    expect(engine.howls[3]?.playCalls).toBe(1);
  });

  it("fail-closes invalid or wrong-kind dedicated keys without touching the other bus", () => {
    const controller = new GameAudioController();
    controller.unlock();
    controller.playStageBeds({ musicKey: "soft-piano", ambientKey: "night-ambient" });
    const originalAmbient = engine.howls[1];

    expect(
      controller.playStageBeds({ musicKey: "night-ambient", ambientKey: "lonely-pad" }),
    ).toEqual({ mode: "dedicated", heardBedIds: ["lonely-pad"] });
    expect(controller.getPlaybackSnapshot()).toMatchObject({
      musicKey: null,
      ambientKey: "lonely-pad",
    });
    expect(originalAmbient?.unloadCalls).toBe(0);

    expect(controller.playStageBeds({ musicKey: "chapter-end", ambientKey: "soft-piano" })).toEqual(
      { mode: "dedicated", heardBedIds: ["chapter-end"] },
    );
    expect(controller.getPlaybackSnapshot()).toMatchObject({
      musicKey: "chapter-end",
      ambientKey: null,
    });

    expect(
      controller.playStageBeds({ musicKey: "not-authored", ambientKey: "night-ambient" }),
    ).toEqual({ mode: "dedicated", heardBedIds: ["night-ambient"] });
    expect(controller.getPlaybackSnapshot()).toMatchObject({
      musicKey: null,
      ambientKey: "night-ambient",
    });
  });

  it("preserves legacy bgm, fallback, default, and invalid-exclusive behavior", () => {
    const controller = new GameAudioController();
    controller.unlock();

    expect(controller.playStageBeds({ bgmKey: "night-ambient" })).toEqual({
      mode: "legacy",
      heardBedIds: ["night-ambient"],
    });
    expect(controller.getPlaybackSnapshot()).toMatchObject({
      musicKey: null,
      ambientKey: "night-ambient",
    });
    expect(controller.playStageBeds({ bgmKey: "night-ambient" })).toEqual({
      mode: "legacy",
      heardBedIds: [],
    });

    expect(controller.playStageBeds({ bgmKey: null, fallbackKey: "chapter-end" })).toEqual({
      mode: "legacy",
      heardBedIds: ["chapter-end"],
    });
    expect(controller.getPlaybackSnapshot()).toMatchObject({
      musicKey: "chapter-end",
      ambientKey: null,
    });

    expect(controller.playStageBeds({})).toEqual({
      mode: "legacy",
      heardBedIds: ["soft-piano"],
    });

    expect(
      controller.playStageBeds({ bgmKey: "not-authored", fallbackKey: "chapter-end" }),
    ).toEqual({ mode: "legacy", heardBedIds: [] });
    expect(controller.getPlaybackSnapshot()).toMatchObject({ musicKey: null, ambientKey: null });
  });

  it("keeps each bus owner safe across overlapping crossfade completions", () => {
    const controller = new GameAudioController();
    controller.unlock();
    controller.playStageBeds({ musicKey: "soft-piano", ambientKey: "night-ambient" });
    const firstMusic = engine.howls[0];
    const firstAmbient = engine.howls[1];

    controller.playStageBeds({ musicKey: "chapter-end", ambientKey: "lonely-pad" });
    const staleMusicFade = engine.fades.find(
      (fade) => fade.howl === firstMusic && typeof fade.onDone === "function",
    );
    const staleAmbientFade = engine.fades.find(
      (fade) => fade.howl === firstAmbient && typeof fade.onDone === "function",
    );

    controller.playStageBeds({ musicKey: "soft-piano", ambientKey: "night-ambient" });
    const newestMusic = engine.howls[4];
    const newestAmbient = engine.howls[5];
    staleMusicFade?.onDone?.();
    staleAmbientFade?.onDone?.();

    expect(staleMusicFade?.cancelled).toBe(true);
    expect(staleAmbientFade?.cancelled).toBe(true);
    expect(newestMusic?.unloadCalls).toBe(0);
    expect(newestAmbient?.unloadCalls).toBe(0);
    expect(controller.getPlaybackSnapshot()).toMatchObject({
      musicKey: "soft-piano",
      ambientKey: "night-ambient",
    });
  });

  it("isolates one dedicated bus load/play error from the other buses, voice, and SFX", () => {
    const controller = new GameAudioController();
    controller.unlock();
    controller.playStageBeds({ musicKey: "soft-piano", ambientKey: "night-ambient" });
    const failedMusic = engine.howls[0];
    const ambient = engine.howls[1];
    const musicError = failedMusic?.options.onplayerror;
    if (typeof musicError === "function") {
      musicError();
    }

    controller.playSfx("notify-soft");
    expect(controller.playVoiceFromBase64("YQ==")).toBe(true);
    expect(controller.getPlaybackSnapshot()).toMatchObject({
      musicKey: null,
      ambientKey: "night-ambient",
      voiceActive: true,
      duckOwner: "voice",
    });
    expect(ambient?.unloadCalls).toBe(0);
    expect(ambient?.volumeValue).toBeCloseTo(0.28 * VOICE_AMBIENT_DUCK);
    expect(engine.howls[2]?.playCalls).toBe(1);

    controller.stopAll();
    controller.playStageBeds({ musicKey: "chapter-end", ambientKey: "lonely-pad" });
    const survivingMusic = engine.howls[4];
    const failedAmbient = engine.howls[5];
    const ambientError = failedAmbient?.options.onloaderror;
    if (typeof ambientError === "function") {
      ambientError();
    }
    expect(controller.getPlaybackSnapshot()).toMatchObject({
      musicKey: "chapter-end",
      ambientKey: null,
      voiceActive: false,
      duckOwner: null,
    });
    expect(survivingMusic?.unloadCalls).toBe(0);
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

describe("gameAudio voice + unlock/mute core", () => {
  beforeEach(resetEngine);

  it("applies mute, unlock, cutscene, duck/release, stopAll, and SFX independently to both beds", () => {
    const controller = new GameAudioController();
    controller.setMuted(true);
    controller.playStageBeds({ musicKey: "soft-piano", ambientKey: "night-ambient" });
    const music = engine.howls[0];
    const ambient = engine.howls[1];
    expect(music?.playCalls).toBe(0);
    expect(ambient?.playCalls).toBe(0);

    controller.unlock();
    controller.unlock();
    expect(music?.playCalls).toBe(0);
    expect(ambient?.playCalls).toBe(0);
    expect(engine.unlockHowler).toHaveBeenCalledOnce();
    controller.setMuted(false);
    controller.setMuted(false);
    expect(music?.playCalls).toBe(1);
    expect(ambient?.playCalls).toBe(1);
    expect(engine.setHowlerMasterMute).toHaveBeenCalledTimes(3);

    controller.pauseBedsForCutscene();
    controller.pauseBedsForCutscene();
    controller.resumeBedsAfterCutscene();
    controller.resumeBedsAfterCutscene();
    expect(music?.pauseCalls).toBe(1);
    expect(ambient?.pauseCalls).toBe(1);
    expect(music?.playCalls).toBe(2);
    expect(ambient?.playCalls).toBe(2);

    expect(controller.playVoiceFromBase64("YQ==")).toBe(true);
    expect(music?.volumeValue).toBeCloseTo(0.42 * VOICE_MUSIC_DUCK);
    expect(ambient?.volumeValue).toBeCloseTo(0.28 * VOICE_AMBIENT_DUCK);
    const bedPlayCalls = [music?.playCalls, ambient?.playCalls];
    controller.playSfx("notify-soft");
    expect(controller.getPlaybackSnapshot().duckOwner).toBe("voice");
    expect([music?.playCalls, ambient?.playCalls]).toEqual(bedPlayCalls);
    controller.stopVoice();
    expect(music?.volumeValue).toBeCloseTo(0.42);
    expect(ambient?.volumeValue).toBeCloseTo(0.28);

    expect(controller.playVoiceFromBase64("YQ==")).toBe(true);
    controller.stopAll();
    expect(controller.getPlaybackSnapshot()).toMatchObject({
      musicKey: null,
      ambientKey: null,
      voiceActive: false,
      duckOwner: null,
      cutscenePaused: false,
    });
    expect(music?.unloadCalls).toBe(1);
    expect(ambient?.unloadCalls).toBe(1);
    expect(engine.howls[4]?.unloadCalls).toBe(1);
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
});

describe("gameAudio sfx", () => {
  beforeEach(resetEngine);

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
});
