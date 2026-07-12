import {
  validateAiEndingContract,
  type AiEndingChoice,
  type AiEndingContract,
  type AiEndingSegment,
} from "@supaluv/shared";
import { ch01Scenes } from "@supaluv/content/ch01-scenes";
import { describe, expect, it } from "vitest";

const choices: readonly AiEndingChoice[] = [
  { id: "stay", label: "留下", actionSummary: "Stay and hear the truth." },
  { id: "leave", label: "离开", actionSummary: "Leave before the answer." },
];

describe("bounded AI ending domain contract", () => {
  it("represents the approved hard limits without provider or database types", () => {
    const contract: AiEndingContract = {
      id: "ending-contract-1",
      storyId: "super-lover",
      entryId: "final-choice",
      allowedOutcomeAnchors: ["robots_choose_each_other", "humans_choose_separate_growth"],
      requiredFacts: ["aila_and_kai_are_persons_not_products"],
      unresolvedThreads: ["suming_shame", "zhou_lu_rabbit_memory"],
      characterInvariants: ["No character suddenly forgets the authored story."],
      toneConstraints: ["adult black comedy", "awkward but emotionally honest"],
      forbiddenOutcomes: ["pornographic escalation", "minor sexualization"],
      allowedSlotIds: ["lead_suming", "lead_zhou_lu", "robot_aila", "robot_kai"],
      allowedBackgrounds: ["courtyard_night", "forest_dawn"],
      maxSegments: 8,
      targetChoicePoints: { min: 3, max: 5 },
      choicesPerPoint: { min: 2, max: 4 },
      maxTotalCharacters: 12_000,
      maxOptionalStills: 2,
      forceTerminalAtSegment: 8,
    };

    expect(JSON.parse(JSON.stringify(contract))).toEqual(contract);
    expect(contract.maxSegments).toBe(8);
    expect(contract.forceTerminalAtSegment).toBe(8);
  });

  it("supports an eight-segment fixture whose final segment is terminal", () => {
    const segments: readonly AiEndingSegment[] = Array.from({ length: 8 }, (_, index) => ({
      sequence: index + 1,
      text: `segment-${index + 1}`,
      beats: [`beat-${index + 1}`],
      choices: index === 7 ? [] : choices,
      continuity: { facts: [`fact-${index + 1}`] },
      terminal: index === 7,
      ...(index === 7 ? { outcomeAnchor: "robots_choose_each_other" } : {}),
    }));

    expect(segments).toHaveLength(8);
    expect(segments.slice(0, -1).every((segment) => !segment.terminal)).toBe(true);
    expect(segments.at(-1)).toMatchObject({ sequence: 8, terminal: true, choices: [] });
  });
});

describe("authored AI ending envelope", () => {
  const envelope = ch01Scenes.find((scene) => scene.id === "ch01_chapter_end")?.aiEnding;

  it("validates the Chapter 1 envelope and all asset keys", () => {
    expect(envelope).toBeDefined();
    expect(
      validateAiEndingContract(envelope, [
        "bg-product-page",
        "bg-rental-room",
        "bg-lobby-white",
        "bg-office-night",
      ]),
    ).toMatchObject({ valid: true });
  });

  it("rejects missing anchors, more than eight segments, bad terminal limits, and unknown assets", () => {
    expect(
      validateAiEndingContract(
        {
          ...envelope,
          allowedOutcomeAnchors: [],
          maxSegments: 9,
          forceTerminalAtSegment: 7,
          allowedBackgrounds: ["invented-background"],
        },
        [],
      ),
    ).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([
        expect.stringMatching(/anchors/),
        expect.stringMatching(/maxSegments/),
        expect.stringMatching(/forceTerminal/),
        expect.stringMatching(/unknown background/),
      ]),
    });
  });
});
