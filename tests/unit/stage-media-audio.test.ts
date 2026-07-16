import { beforeEach, describe, expect, it, vi } from "vitest";

const { playStageBeds } = vi.hoisted(() => ({
  playStageBeds: vi.fn(),
}));

vi.mock("../../apps/web/src/audio/gameAudio", () => ({
  gameAudio: {
    playStageBeds,
  },
  isSceneCueSfx: vi.fn(() => false),
}));

import { playStagePresentationBeds } from "../../apps/web/src/views/play/useStageMedia";

describe("stage media bed orchestration", () => {
  beforeEach(() => {
    playStageBeds.mockReset();
  });

  it("forwards dedicated keys and reports each valid final stable id once", () => {
    playStageBeds.mockReturnValue({
      mode: "dedicated",
      heardBedIds: ["soft-piano", "night-ambient"],
    });
    const onBedHeard = vi.fn();

    playStagePresentationBeds(
      { musicKey: "soft-piano", ambientKey: "night-ambient", bgmKey: "chapter-end" },
      onBedHeard,
    );

    expect(playStageBeds).toHaveBeenCalledOnce();
    expect(playStageBeds).toHaveBeenCalledWith({
      musicKey: "soft-piano",
      ambientKey: "night-ambient",
      bgmKey: "chapter-end",
      fallbackKey: "soft-piano",
    });
    expect(onBedHeard.mock.calls).toEqual([["soft-piano"], ["night-ambient"]]);
  });

  it("reports only the legacy exclusive id and never reports invalid/stopped keys", () => {
    const onBedHeard = vi.fn();
    playStageBeds.mockReturnValueOnce({
      mode: "legacy",
      heardBedIds: ["chapter-end"],
    });
    playStagePresentationBeds({ bgmKey: "chapter-end" }, onBedHeard);
    expect(onBedHeard).toHaveBeenCalledOnce();
    expect(onBedHeard).toHaveBeenCalledWith("chapter-end");

    onBedHeard.mockClear();
    playStageBeds.mockReturnValueOnce({ mode: "dedicated", heardBedIds: [] });
    playStagePresentationBeds({ musicKey: "not-authored", ambientKey: null }, onBedHeard);
    expect(onBedHeard).not.toHaveBeenCalled();
  });
});
