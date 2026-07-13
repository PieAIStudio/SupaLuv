import { describe, expect, it } from "vitest";
import {
  emotionCalibrationLevels,
  emotionCalibrationSamples,
  isCorrectEmotionCalibrationSelection,
} from "../../apps/web/src/interactions/emotionCalibration";
import {
  getStoryInteractionDefinition,
  listRegisteredStoryInteractions,
  resolveStoryInteraction,
} from "../../apps/web/src/interactions/storyInteractionRegistry";

describe("StoryInteraction registry", () => {
  it("registers the reusable emotion calibration definition", () => {
    expect(listRegisteredStoryInteractions()).toEqual([
      expect.objectContaining({
        id: "emotion-calibration-v1",
        type: "emotion-calibration",
        stepCount: 3,
      }),
    ]);
    expect(getStoryInteractionDefinition("emotion-calibration-v1")?.title).toBe("情绪样本校准");
  });

  it("resolves only stable authored metadata, never dialogue text", () => {
    expect(
      resolveStoryInteraction({
        tags: [
          "scene:dch01_emotion_calibration",
          "interaction:emotion-calibration-v1",
          "interaction-step:2",
        ],
      }),
    ).toEqual({
      definition: expect.objectContaining({ id: "emotion-calibration-v1" }),
      stepIndex: 1,
    });

    expect(resolveStoryInteraction({ tags: ["scene:dch01_emotion_calibration"] })).toBeNull();
    expect(
      resolveStoryInteraction({
        tags: ["interaction:unknown", "interaction-step:1"],
      }),
    ).toBeNull();
    expect(
      resolveStoryInteraction({
        tags: ["interaction:emotion-calibration-v1", "interaction-step:4"],
      }),
    ).toBeNull();
  });
});

describe("emotion calibration content contract", () => {
  it("keeps three authored fictional samples and three accessible levels in config", () => {
    expect(emotionCalibrationSamples).toHaveLength(3);
    expect(emotionCalibrationLevels.map((level) => level.label)).toEqual(["平静", "刺痛", "爆表"]);
    expect(emotionCalibrationLevels.map((level) => level.key)).toEqual(["1", "2", "3"]);
    expect(emotionCalibrationSamples.every((sample) => sample.sender.startsWith("匿名样本"))).toBe(
      true,
    );

    const allChoiceIds = emotionCalibrationSamples.flatMap((sample) => [
      ...Object.values(sample.choiceIds),
      sample.skipChoiceId,
    ]);
    expect(new Set(allChoiceIds).size).toBe(allChoiceIds.length);
  });

  it("defines one correct band per sample without treating other picks as invalid", () => {
    for (const sample of emotionCalibrationSamples) {
      const results = emotionCalibrationLevels.map((level) =>
        isCorrectEmotionCalibrationSelection(sample, level.id),
      );
      expect(results.filter(Boolean)).toHaveLength(1);
    }
  });
});
