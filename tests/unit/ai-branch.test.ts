import { describe, expect, it, vi } from "vitest";
import { getAiBranchProvider } from "../../apps/web/src/ai/aiBranchProvider";
import { createMockAiBranchProvider } from "../../apps/web/src/ai/mockAiBranchProvider";
import { createInkStoryRunner } from "../../apps/web/src/story/inkStoryRunner";
import { ch01InkSource } from "@supaluv/content";

describe("constrained AI branch", () => {
  it("live provider requires access token", async () => {
    const provider = getAiBranchProvider();
    await expect(
      provider.generate({
        storyId: "ch01",
        sceneId: "ch01_office_delete_or_shot",
        authoredChoiceLabels: ["立刻删掉"],
        accessToken: null,
        config: {
          enabled: true,
          rejoinSceneId: "ch01_phone_buzz",
          maxAiBeats: 1,
          context: "test",
        },
      }),
    ).rejects.toThrow(/AUTH_REQUIRED/);
  });

  it("mock provider always rejoins authored scene id from config", async () => {
    vi.stubGlobal(
      "window",
      Object.assign(globalThis, {
        setTimeout,
        clearTimeout,
      }),
    );

    const provider = createMockAiBranchProvider();
    const result = await provider.generate({
      storyId: "ch01",
      sceneId: "ch01_office_delete_or_shot",
      authoredChoiceLabels: ["立刻删掉", "先截图备份"],
      config: {
        enabled: true,
        rejoinSceneId: "ch01_phone_buzz",
        maxAiBeats: 2,
        context: "test",
        artPool: ["bg-office-night"],
        portraitPool: ["suming-panic", "suming-shame"],
      },
    });

    expect(result.rejoinSceneId).toBe("ch01_phone_buzz");
    expect(result.choiceLabel.length).toBeGreaterThan(4);
    expect(result.beats.length).toBeGreaterThan(0);
    expect(result.beats.length).toBeLessThanOrEqual(2);
    for (const beat of result.beats) {
      expect(beat.text.length).toBeGreaterThan(8);
    }
  });

  it("ink runner can jump to rejoin knot after side content", () => {
    const runner = createInkStoryRunner(ch01InkSource);
    // Advance to first branch scene roughly via continues — or jump directly.
    const joined = runner.jumpTo("ch01_phone_buzz");
    expect(joined.sceneId).toBe("ch01_phone_buzz");
    expect(joined.text.length).toBeGreaterThan(0);
  });
});
