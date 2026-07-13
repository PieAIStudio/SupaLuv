import { beforeEach, describe, expect, it, vi } from "vitest";

const { setMuted, setMusicVolume, setAmbientVolume, setSfxVolume, setVoiceVolume } = vi.hoisted(
  () => ({
    setMuted: vi.fn(),
    setMusicVolume: vi.fn(),
    setAmbientVolume: vi.fn(),
    setSfxVolume: vi.fn(),
    setVoiceVolume: vi.fn(),
  }),
);

vi.mock("../../apps/web/src/audio/gameAudio", () => ({
  gameAudio: {
    setMuted,
    setMusicVolume,
    setAmbientVolume,
    setSfxVolume,
    setVoiceVolume,
  },
}));

import { syncGameAudioFromSettings } from "../../apps/web/src/audio/syncGameAudioFromSettings";

describe("syncGameAudioFromSettings", () => {
  beforeEach(() => {
    setMuted.mockClear();
    setMusicVolume.mockClear();
    setAmbientVolume.mockClear();
    setSfxVolume.mockClear();
    setVoiceVolume.mockClear();
  });

  it("applies all five persisted gain channels to the engine singleton", () => {
    syncGameAudioFromSettings({
      masterMuted: true,
      musicVolume: 0.1,
      ambientVolume: 0.2,
      sfxVolume: 0.3,
      voiceVolume: 0.4,
    });

    expect(setMuted).toHaveBeenCalledOnce();
    expect(setMuted).toHaveBeenCalledWith(true);
    expect(setMusicVolume).toHaveBeenCalledWith(0.1);
    expect(setAmbientVolume).toHaveBeenCalledWith(0.2);
    expect(setSfxVolume).toHaveBeenCalledWith(0.3);
    expect(setVoiceVolume).toHaveBeenCalledWith(0.4);
  });
});
