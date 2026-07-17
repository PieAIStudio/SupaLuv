import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveStoryInteraction } from "../../apps/web/src/interactions/storyInteractionRegistry";
import {
  createInkStoryRunnerFromCompiled,
  type InkStoryRunner,
  type InkStorySnapshot,
} from "../../apps/web/src/story/inkStoryRunner";

const ch01 = readFileSync(
  resolve(process.cwd(), "packages/content/compiled/draft-ch01.json"),
  "utf8",
);
const ch02 = readFileSync(
  resolve(process.cwd(), "packages/content/compiled/draft-ch02.json"),
  "utf8",
);
const ch03 = readFileSync(
  resolve(process.cwd(), "packages/content/compiled/draft-ch03.json"),
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

function skipUntil(runner: InkStoryRunner, targetScene: string, max = 80): void {
  for (let i = 0; i < max; i += 1) {
    const snap = runner.getSnapshot();
    if (snap.sceneId === targetScene) {
      return;
    }
    if (snap.isEnded || snap.choices.length === 0) {
      throw new Error(`Could not reach ${targetScene}; stopped at ${snap.sceneId}`);
    }
    // Prefer continue / skip / first stable choice that advances without free-text.
    const preferred =
      snap.choices.find(
        (c) => c.choiceId?.endsWith("_continue") || c.choiceId?.endsWith("_skip"),
      ) ??
      snap.choices.find((c) => c.choiceId?.includes("_ok") || c.choiceId?.includes("_literal")) ??
      snap.choices[0]!;
    runner.choose(preferred.index);
  }
  throw new Error(`Could not reach ${targetScene} within ${max} steps`);
}

describe("draft ch01 protocol-test-v1", () => {
  it("inserts after s002, records choices, and continues to s003", () => {
    const runner = createInkStoryRunnerFromCompiled(ch01);
    chooseById(runner, "dch01_s001_continue");
    // skip emotion calibration
    chooseById(runner, "emotion_calibration_q1_skip");
    chooseById(runner, "emotion_calibration_continue");
    expect(runner.getSnapshot().sceneId).toBe("dch01_s002");
    chooseById(runner, "dch01_s002_continue");

    const step1 = runner.getSnapshot();
    expect(resolveStoryInteraction(step1)?.definition.id).toBe("protocol-test-v1");
    expect(resolveStoryInteraction(step1)?.stepIndex).toBe(0);
    chooseById(runner, "protocol_test_q1_literal");
    chooseById(runner, "protocol_test_q2_model");
    const result = chooseById(runner, "protocol_test_q3_model");
    expect(resolveStoryInteraction(result)).toBeNull();
    expect(runner.getVariable("protocol_test_q1")).toBe("literal");
    expect(runner.getVariable("protocol_test_q2")).toBe("model");
    expect(runner.getVariable("protocol_test_q3")).toBe("model");
    expect(runner.getVariable("protocol_test_completed_at_version")).toBe("protocol-test-v1");
    expect(chooseById(runner, "protocol_test_continue").sceneId).toBe("dch01_s003");
  });

  it("skip does not block the authored path", () => {
    const runner = createInkStoryRunnerFromCompiled(ch01);
    chooseById(runner, "dch01_s001_continue");
    chooseById(runner, "emotion_calibration_q1_skip");
    chooseById(runner, "emotion_calibration_continue");
    chooseById(runner, "dch01_s002_continue");
    chooseById(runner, "protocol_test_q1_skip");
    expect(runner.getVariable("protocol_test_skipped")).toBe(true);
    expect(chooseById(runner, "protocol_test_continue").sceneId).toBe("dch01_s003");
  });
});

describe("draft ch02 narrative interactions", () => {
  it("barcode-sweep after s002 continues to s003", () => {
    const runner = createInkStoryRunnerFromCompiled(ch02);
    chooseById(runner, "dch02_s001_continue");
    chooseById(runner, "dch02_s002_continue");
    expect(resolveStoryInteraction(runner.getSnapshot())?.definition.id).toBe("barcode-sweep-v1");
    chooseById(runner, "barcode_sweep_q1_ok");
    chooseById(runner, "barcode_sweep_q2_ok");
    chooseById(runner, "barcode_sweep_q3_ok");
    expect(runner.getVariable("barcode_sweep_completed_at_version")).toBe("barcode-sweep-v1");
    expect(chooseById(runner, "barcode_sweep_continue").sceneId).toBe("dch02_s003");
  });

  it("housing-hotspots and mobile-questionnaire complete or skip into next scenes", () => {
    const runner = createInkStoryRunnerFromCompiled(ch02);
    skipUntil(runner, "dch02_s017");
    // s017 guest choices lead into housing hotspots
    const guest = runner.getSnapshot().choices.find((c) => c.choiceId === "d2_ask_guest");
    if (!guest) throw new Error("missing d2_ask_guest");
    runner.choose(guest.index);
    expect(resolveStoryInteraction(runner.getSnapshot())?.definition.id).toBe(
      "housing-hotspots-v1",
    );
    chooseById(runner, "housing_hotspots_q1_wall");
    chooseById(runner, "housing_hotspots_q2_cat");
    chooseById(runner, "housing_hotspots_q3_stairwell");
    expect(chooseById(runner, "housing_hotspots_continue").sceneId).toBe("dch02_s018");

    skipUntil(runner, "dch02_s028");
    const apply = runner.getSnapshot().choices.find((c) => c.choiceId === "d2_apply");
    if (!apply) throw new Error("missing d2_apply");
    runner.choose(apply.index);
    expect(resolveStoryInteraction(runner.getSnapshot())?.definition.id).toBe(
      "mobile-questionnaire-v1",
    );
    chooseById(runner, "mobile_questionnaire_q1_good");
    chooseById(runner, "mobile_questionnaire_q2_fine");
    chooseById(runner, "mobile_questionnaire_q3_yes");
    expect(runner.getVariable("mobile_questionnaire_completed_at_version")).toBe(
      "mobile-questionnaire-v1",
    );
    expect(chooseById(runner, "mobile_questionnaire_continue").sceneId).toBe("dch02_s029");
  });

  it("reaches chapter-2 endpoint with interactions on path", () => {
    const runner = createInkStoryRunnerFromCompiled(ch02);
    for (let i = 0; i < 120; i += 1) {
      const snap = runner.getSnapshot();
      if (snap.isEnded) {
        break;
      }
      if (snap.choices.length === 0) {
        throw new Error(`stuck at ${snap.sceneId}`);
      }
      const preferred =
        snap.choices.find((c) => c.choiceId?.endsWith("_continue")) ??
        snap.choices.find((c) => c.choiceId?.endsWith("_skip")) ??
        snap.choices.find((c) => c.choiceId?.includes("_ok")) ??
        snap.choices[0]!;
      runner.choose(preferred.index);
    }
    expect(runner.getSnapshot().isEnded || runner.getSnapshot().sceneId === "d2_chapter_end").toBe(
      true,
    );
    expect(runner.getVariable("barcode_sweep_completed_at_version")).toBeTruthy();
    expect(runner.getVariable("housing_hotspots_completed_at_version")).toBeTruthy();
    expect(runner.getVariable("mobile_questionnaire_completed_at_version")).toBeTruthy();
  });
});

describe("draft ch03 robot barcode + questionnaire density", () => {
  it("robot barcode after s022 completes every segment and continues to s023", () => {
    const runner = createInkStoryRunnerFromCompiled(ch03);
    skipUntil(runner, "dch03_s022");
    chooseById(runner, "dch03_s022_continue");
    expect(resolveStoryInteraction(runner.getSnapshot())?.definition.id).toBe("barcode-sweep-v1");
    const mianziBefore = Number(runner.getVariable("mianzi"));
    const aiBefore = Number(runner.getVariable("ai_score"));
    chooseById(runner, "barcode_sweep_q1_ok");
    chooseById(runner, "barcode_sweep_q2_ok");
    chooseById(runner, "barcode_sweep_q3_ok");
    expect(runner.getVariable("barcode_sweep_completed_at_version")).toBe("barcode-sweep-v1");
    expect(runner.getVariable("barcode_sweep_skipped")).toBe(false);
    expect(Number(runner.getVariable("ai_score"))).toBeGreaterThan(aiBefore);
    expect(Number(runner.getVariable("mianzi"))).toBeLessThan(mianziBefore);
    expect(chooseById(runner, "barcode_sweep_continue").sceneId).toBe("dch03_s023");
  });

  it("robot barcode skip path records flag and returns to authored chapter text", () => {
    const runner = createInkStoryRunnerFromCompiled(ch03);
    skipUntil(runner, "dch03_s022");
    chooseById(runner, "dch03_s022_continue");
    const mianziBefore = Number(runner.getVariable("mianzi"));
    const aiBefore = Number(runner.getVariable("ai_score"));
    chooseById(runner, "barcode_sweep_q1_skip");
    expect(runner.getVariable("barcode_sweep_skipped")).toBe(true);
    expect(runner.getVariable("barcode_sweep_completed_at_version")).toBe("barcode-sweep-v1");
    expect(Number(runner.getVariable("mianzi"))).toBeGreaterThan(mianziBefore);
    expect(Number(runner.getVariable("ai_score"))).toBeLessThan(aiBefore);
    expect(chooseById(runner, "barcode_sweep_continue").sceneId).toBe("dch03_s023");
  });

  it("mobile questionnaire remains on path before coat beat", () => {
    const runner = createInkStoryRunnerFromCompiled(ch03);
    chooseById(runner, "dch03_s001_continue");
    chooseById(runner, "dch03_s002_continue");
    const face = runner.getSnapshot().choices.find((c) => c.choiceId === "d3_face_template");
    if (!face) throw new Error("missing d3_face_template");
    runner.choose(face.index);
    expect(resolveStoryInteraction(runner.getSnapshot())?.definition.id).toBe(
      "mobile-questionnaire-v1",
    );
    chooseById(runner, "mobile_questionnaire_q1_skip");
    expect(runner.getVariable("mobile_questionnaire_skipped")).toBe(true);
    expect(chooseById(runner, "mobile_questionnaire_continue").sceneId).toBe("dch03_s004");
  });
});
