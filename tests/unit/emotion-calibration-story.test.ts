import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  presentationFromSnapshot,
  restoreSnapshotFromSave,
} from "../../apps/web/src/persistence/gameSave";
import {
  createInkStoryRunnerFromCompiled,
  type InkStoryRunner,
  type InkStorySnapshot,
} from "../../apps/web/src/story/inkStoryRunner";
import { resolveStoryInteraction } from "../../apps/web/src/interactions/storyInteractionRegistry";

const compiled = readFileSync(
  resolve(process.cwd(), "packages/content/compiled/draft-ch01.json"),
  "utf8",
);

function chooseById(runner: InkStoryRunner, choiceId: string): InkStorySnapshot {
  const snapshot = runner.getSnapshot();
  const choice = snapshot.choices.find((entry) => entry.choiceId === choiceId);
  if (!choice) {
    throw new Error(`Missing authored choice ${choiceId} at ${snapshot.sceneId ?? "unknown"}.`);
  }
  return runner.choose(choice.index);
}

function startCalibration(): InkStoryRunner {
  const runner = createInkStoryRunnerFromCompiled(compiled);
  expect(runner.getSnapshot().sceneId).toBe("dch01_s001");
  chooseById(runner, "dch01_s001_continue");
  return runner;
}

describe("draft chapter 1 emotion calibration", () => {
  it("triggers from authored Ink metadata at the first chat-record beat", () => {
    const runner = startCalibration();
    const snapshot = runner.getSnapshot();
    expect(snapshot.sceneId).toBe("dch01_emotion_calibration");
    expect(resolveStoryInteraction(snapshot)).toEqual({
      definition: expect.objectContaining({ id: "emotion-calibration-v1" }),
      stepIndex: 0,
    });
    expect(snapshot.choices.map((choice) => choice.choiceId)).toEqual([
      "emotion_calibration_q1_calm",
      "emotion_calibration_q1_sting",
      "emotion_calibration_q1_overload",
      "emotion_calibration_q1_skip",
    ]);
  });

  it.each([
    ["emotion_calibration_q1_calm", "calm", 1],
    ["emotion_calibration_q1_sting", "sting", 0],
    ["emotion_calibration_q1_overload", "overload", 0],
  ] as const)("writes the first selection for %s and advances", (choiceId, value, correctCount) => {
    const runner = startCalibration();
    const next = chooseById(runner, choiceId);
    expect(runner.getVariable("emotion_calibration_q1")).toBe(value);
    expect(runner.getVariable("emotion_calibration_correct_count")).toBe(correctCount);
    expect(resolveStoryInteraction(next)?.stepIndex).toBe(1);
  });

  it("stores all selections, correct count, skip flag, and completed version", () => {
    const runner = startCalibration();
    chooseById(runner, "emotion_calibration_q1_calm");
    chooseById(runner, "emotion_calibration_q2_sting");
    const result = chooseById(runner, "emotion_calibration_q3_overload");

    expect(resolveStoryInteraction(result)).toBeNull();
    expect(runner.getVariable("emotion_calibration_correct_count")).toBe(3);
    expect(runner.getVariable("emotion_calibration_skipped")).toBe(false);
    expect(runner.getVariable("emotion_calibration_q1")).toBe("calm");
    expect(runner.getVariable("emotion_calibration_q2")).toBe("sting");
    expect(runner.getVariable("emotion_calibration_q3")).toBe("overload");
    expect(runner.getVariable("emotion_calibration_completed_at_version")).toBe(
      "emotion-calibration-v1",
    );
    expect(result.text).toContain("三格指示灯同时转绿");

    const continued = chooseById(runner, "emotion_calibration_continue");
    expect(continued.sceneId).toBe("dch01_s002");
  });

  it("lets the player skip without blocking the story and preserves earlier picks", () => {
    const runner = startCalibration();
    chooseById(runner, "emotion_calibration_q1_sting");
    const result = chooseById(runner, "emotion_calibration_q2_skip");

    expect(runner.getVariable("emotion_calibration_skipped")).toBe(true);
    expect(runner.getVariable("emotion_calibration_q1")).toBe("sting");
    expect(runner.getVariable("emotion_calibration_q2")).toBe("unanswered");
    expect(runner.getVariable("emotion_calibration_q3")).toBe("unanswered");
    expect(runner.getVariable("emotion_calibration_completed_at_version")).toBe(
      "emotion-calibration-v1",
    );
    expect(result.text).toContain("主测照常");
    expect(chooseById(runner, "emotion_calibration_continue").sceneId).toBe("dch01_s002");
  });

  it("restores the interaction step and authored choices from save presentation", () => {
    const runner = startCalibration();
    const stepTwo = chooseById(runner, "emotion_calibration_q1_calm");
    const presentation = presentationFromSnapshot(stepTwo);
    const restoredRunner = createInkStoryRunnerFromCompiled(compiled, runner.exportStateJson());
    const restored = restoreSnapshotFromSave(restoredRunner.getSnapshot(), presentation);

    expect(resolveStoryInteraction(restored)?.stepIndex).toBe(1);
    expect(restored.choices.map((choice) => choice.choiceId)).toContain(
      "emotion_calibration_q2_sting",
    );
    expect(restoredRunner.getVariable("emotion_calibration_q1")).toBe("calm");
  });

  it("is idempotent when the completed knot is entered again", () => {
    const runner = startCalibration();
    chooseById(runner, "emotion_calibration_q1_calm");
    chooseById(runner, "emotion_calibration_q2_sting");
    chooseById(runner, "emotion_calibration_q3_overload");
    const before = runner.getVariable("emotion_calibration_correct_count");

    const reentered = runner.jumpTo("dch01_emotion_calibration");
    expect(resolveStoryInteraction(reentered)).toBeNull();
    expect(reentered.text).toContain("三格指示灯同时转绿");
    expect(runner.getVariable("emotion_calibration_correct_count")).toBe(before);
  });

  it("uses neutral authored feedback for non-matching selections", () => {
    const runner = startCalibration();
    chooseById(runner, "emotion_calibration_q1_overload");
    chooseById(runner, "emotion_calibration_q2_overload");
    const result = chooseById(runner, "emotion_calibration_q3_calm");
    expect(result.text).toContain("这不是考试");
  });
});
