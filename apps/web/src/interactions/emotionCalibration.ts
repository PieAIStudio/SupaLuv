import type { StoryInteractionDefinition } from "./types";

export const EMOTION_CALIBRATION_VERSION = "emotion-calibration-v1";

export type EmotionCalibrationLevel = "calm" | "sting" | "overload";

export interface EmotionCalibrationLevelDefinition {
  readonly id: EmotionCalibrationLevel;
  readonly label: string;
  readonly key: "1" | "2" | "3";
  readonly description: string;
}

export interface EmotionCalibrationSample {
  readonly id: string;
  readonly sender: string;
  readonly message: string;
  readonly expectedLevel: EmotionCalibrationLevel;
  readonly choiceIds: Readonly<Record<EmotionCalibrationLevel, string>>;
  readonly skipChoiceId: string;
}

export const emotionCalibrationLevels: readonly EmotionCalibrationLevelDefinition[] = [
  {
    id: "calm",
    label: "平静",
    key: "1",
    description: "信息明确，没有明显拉扯。",
  },
  {
    id: "sting",
    label: "刺痛",
    key: "2",
    description: "表面克制，底下有一道情绪倒刺。",
  },
  {
    id: "overload",
    label: "爆表",
    key: "3",
    description: "冲突已经越过普通波动线。",
  },
] as const;

/** Authored fictional samples; no user chat or free text enters this interaction. */
export const emotionCalibrationSamples: readonly EmotionCalibrationSample[] = [
  {
    id: "calibration-sample-01",
    sender: "匿名样本 A",
    message: "报告收到了，辛苦。明天再聊。",
    expectedLevel: "calm",
    choiceIds: {
      calm: "emotion_calibration_q1_calm",
      sting: "emotion_calibration_q1_sting",
      overload: "emotion_calibration_q1_overload",
    },
    skipChoiceId: "emotion_calibration_q1_skip",
  },
  {
    id: "calibration-sample-02",
    sender: "匿名样本 B",
    message: "没事，你忙。我已经习惯等了。",
    expectedLevel: "sting",
    choiceIds: {
      calm: "emotion_calibration_q2_calm",
      sting: "emotion_calibration_q2_sting",
      overload: "emotion_calibration_q2_overload",
    },
    skipChoiceId: "emotion_calibration_q2_skip",
  },
  {
    id: "calibration-sample-03",
    sender: "匿名样本 C",
    message: "你再拿‘为你好’当理由，我就把门锁换了。",
    expectedLevel: "overload",
    choiceIds: {
      calm: "emotion_calibration_q3_calm",
      sting: "emotion_calibration_q3_sting",
      overload: "emotion_calibration_q3_overload",
    },
    skipChoiceId: "emotion_calibration_q3_skip",
  },
] as const;

export const emotionCalibrationInteraction: StoryInteractionDefinition = {
  id: EMOTION_CALIBRATION_VERSION,
  type: "emotion-calibration",
  version: EMOTION_CALIBRATION_VERSION,
  title: "情绪样本校准",
  stepCount: emotionCalibrationSamples.length,
};

export function isCorrectEmotionCalibrationSelection(
  sample: EmotionCalibrationSample,
  level: EmotionCalibrationLevel,
): boolean {
  return sample.expectedLevel === level;
}
