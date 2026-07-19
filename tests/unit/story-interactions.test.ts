import { describe, expect, it } from "vitest";
import {
  emotionCalibrationLevels,
  emotionCalibrationSamples,
  isCorrectEmotionCalibrationSelection,
} from "../../apps/web/src/interactions/emotionCalibration";
import { protocolTestClauses } from "../../apps/web/src/interactions/protocolTest";
import {
  barcodeSweepRounds,
  resolveBarcodeSweepPayload,
} from "../../apps/web/src/interactions/barcodeSweep";
import { housingHotspots } from "../../apps/web/src/interactions/housingHotspots";
import {
  mobileQuestionnaireQuestions,
  resolveMobileQuestionnairePayload,
} from "../../apps/web/src/interactions/mobileQuestionnaire";
import {
  getStoryInteractionDefinition,
  listRegisteredStoryInteractions,
  resolveStoryInteraction,
} from "../../apps/web/src/interactions/storyInteractionRegistry";
import { en } from "../../apps/web/src/i18n/locales/en";
import { zhCN } from "../../apps/web/src/i18n/locales/zh-CN";

function lookupMessage(tree: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let cursor: unknown = tree;
  for (const part of parts) {
    if (!cursor || typeof cursor !== "object") {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return typeof cursor === "string" ? cursor : undefined;
}

describe("StoryInteraction registry", () => {
  it("registers all five story-native interaction definitions", () => {
    const ids = listRegisteredStoryInteractions()
      .map((entry) => entry.id)
      .sort();
    expect(ids).toEqual([
      "barcode-sweep-v1",
      "emotion-calibration-v1",
      "housing-hotspots-v1",
      "mobile-questionnaire-v1",
      "protocol-test-v1",
    ]);
    expect(getStoryInteractionDefinition("emotion-calibration-v1")?.title).toBe("情绪样本校准");
    expect(getStoryInteractionDefinition("protocol-test-v1")?.stepCount).toBe(3);
    expect(getStoryInteractionDefinition("barcode-sweep-v1")?.type).toBe("barcode-sweep");
    expect(getStoryInteractionDefinition("housing-hotspots-v1")?.type).toBe("housing-hotspots");
    expect(getStoryInteractionDefinition("mobile-questionnaire-v1")?.type).toBe(
      "mobile-questionnaire",
    );
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
      variant: null,
    });

    expect(
      resolveStoryInteraction({
        tags: ["interaction:protocol-test-v1", "interaction-step:3"],
      }),
    ).toEqual({
      definition: expect.objectContaining({ id: "protocol-test-v1" }),
      stepIndex: 2,
      variant: null,
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

  it("parses interaction-variant tags and defaults to null when absent", () => {
    expect(
      resolveStoryInteraction({
        tags: [
          "interaction:mobile-questionnaire-v1",
          "interaction-variant:matching",
          "interaction-step:1",
        ],
      }),
    ).toEqual({
      definition: expect.objectContaining({ id: "mobile-questionnaire-v1" }),
      stepIndex: 0,
      variant: "matching",
    });

    expect(
      resolveStoryInteraction({
        tags: [
          "interaction:barcode-sweep-v1",
          "interaction-variant:activation",
          "interaction-step:2",
        ],
      }),
    ).toEqual({
      definition: expect.objectContaining({ id: "barcode-sweep-v1" }),
      stepIndex: 1,
      variant: "activation",
    });

    expect(
      resolveStoryInteraction({
        tags: ["interaction:barcode-sweep-v1", "interaction-step:1"],
      })?.variant,
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

describe("round-9 interaction content contracts", () => {
  it("keeps unique stable choice IDs for each interaction", () => {
    const protocolIds = protocolTestClauses.flatMap((clause) => [
      ...Object.values(clause.choiceIds),
      clause.skipChoiceId,
    ]);
    const barcodeIds = barcodeSweepRounds.flatMap((round) => [
      round.completeChoiceId,
      round.skipChoiceId,
    ]);
    const housingIds = housingHotspots.map((spot) => spot.inspectChoiceId);
    const mobileIds = mobileQuestionnaireQuestions.flatMap((question) => [
      ...question.options.map((option) => option.choiceId),
      question.skipChoiceId,
    ]);
    for (const ids of [protocolIds, barcodeIds, housingIds, mobileIds]) {
      expect(new Set(ids).size).toBe(ids.length);
    }
    expect(protocolTestClauses).toHaveLength(3);
    expect(barcodeSweepRounds).toHaveLength(3);
    expect(housingHotspots).toHaveLength(3);
    expect(mobileQuestionnaireQuestions).toHaveLength(3);
    for (const question of mobileQuestionnaireQuestions) {
      expect(question.options.length).toBeGreaterThanOrEqual(2);
      expect(question.options.length).toBeLessThanOrEqual(4);
    }
  });
});

describe("interaction variant payloads", () => {
  it("keeps ch02 default mobile/barcode payloads bit-stable without variant", () => {
    const mobileDefault = resolveMobileQuestionnairePayload(null);
    expect(mobileDefault.variant).toBe("default");
    expect(mobileDefault.questions.map((q) => q.questionKey)).toEqual([
      "neighbor",
      "humanlike",
      "room",
    ]);
    expect(mobileDefault.questions[0]?.options.map((o) => o.id)).toEqual([
      "average",
      "good",
      "excellent",
      "skip_rate",
    ]);

    const barcodeDefault = resolveBarcodeSweepPayload(undefined);
    expect(barcodeDefault.variant).toBe("default");
    expect(barcodeDefault.rounds.map((r) => r.productKey)).toEqual(["snack", "drink", "instant"]);
  });

  it("resolves ch03 matching questionnaire and activation barcode payloads", () => {
    const matching = resolveMobileQuestionnairePayload("matching");
    expect(matching.variant).toBe("matching");
    expect(matching.questions).toHaveLength(3);
    expect(matching.questions.map((q) => q.questionKey)).toEqual([
      "humanlike",
      "grudge",
      "makeup",
    ]);
    // Same choice topology as default (Ink frozen).
    expect(matching.questions[0]?.options.map((o) => o.choiceId)).toEqual(
      resolveMobileQuestionnairePayload(null).questions[0]?.options.map((o) => o.choiceId),
    );

    const activation = resolveBarcodeSweepPayload("activation");
    expect(activation.variant).toBe("activation");
    expect(activation.rounds.map((r) => r.productKey)).toEqual(["unit", "limb", "head"]);
    expect(activation.rounds.map((r) => r.completeChoiceId)).toEqual(
      resolveBarcodeSweepPayload(null).rounds.map((r) => r.completeChoiceId),
    );
  });

  it("ships zh/en i18n strings for ch03 matching + activation display keys", () => {
    const matching = resolveMobileQuestionnairePayload("matching");
    for (const locale of [zhCN, en]) {
      expect(lookupMessage(locale, "interaction.mobile.variant.matching.kicker")).toBeTruthy();
      expect(
        lookupMessage(locale, "interaction.mobile.variant.matching.instructions"),
      ).toBeTruthy();
      for (const question of matching.questions) {
        expect(
          lookupMessage(
            locale,
            `interaction.mobile.variant.matching.question.${question.questionKey}`,
          ),
        ).toBeTruthy();
        for (const option of question.options) {
          expect(
            lookupMessage(
              locale,
              `interaction.mobile.variant.matching.option.${question.questionKey}.${option.id}`,
            ),
          ).toBeTruthy();
        }
      }
    }

    const activation = resolveBarcodeSweepPayload("activation");
    for (const locale of [zhCN, en]) {
      expect(lookupMessage(locale, "interaction.barcode.variant.activation.kicker")).toBe(
        locale === zhCN ? "心动引擎 · 开箱合规" : "HEARTBEAT ENGINE · UNBOXING COMPLIANCE",
      );
      for (const round of activation.rounds) {
        expect(
          lookupMessage(
            locale,
            `interaction.barcode.variant.activation.product.${round.productKey}`,
          ),
        ).toBeTruthy();
      }
    }

    // Exact ch03 zh/en copy from brief (first three options when ink topology has 3 slots).
    expect(lookupMessage(zhCN, "interaction.mobile.variant.matching.appLabel")).toBe(
      "HeartSync 匹配",
    );
    expect(lookupMessage(en, "interaction.mobile.variant.matching.appLabel")).toBe(
      "HeartSync Match",
    );
    expect(lookupMessage(zhCN, "interaction.barcode.variant.activation.product.unit")).toBe(
      "主机箱 · 激活码 01",
    );
    expect(lookupMessage(en, "interaction.barcode.variant.activation.product.head")).toBe(
      "Head box · Activation code 03",
    );
  });

  it("falls unknown variants back to default (ch02-safe)", () => {
    expect(resolveMobileQuestionnairePayload("unknown-future").variant).toBe("default");
    expect(resolveBarcodeSweepPayload("mystery").variant).toBe("default");
  });
});
