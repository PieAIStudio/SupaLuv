import { describe, expect, it, vi } from "vitest";
import { getAiBranchProvider } from "../../apps/web/src/ai/aiBranchProvider";
import { createMockAiBranchProvider } from "../../apps/web/src/ai/mockAiBranchProvider";
import { createInkStoryRunnerForId } from "../../apps/web/src/story/inkStoryRunner";

describe("constrained AI branch", () => {
  it("live provider requires access token", async () => {
    const provider = getAiBranchProvider();
    await expect(
      provider.generate({
        storyId: "draft-ch01",
        sceneId: "dch01_s003",
        authoredChoiceLabels: ["点头：至少说人话了"],
        accessToken: null,
        config: {
          enabled: true,
          rejoinSceneId: "dch01_s004",
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
      storyId: "draft-ch01",
      sceneId: "dch01_s003",
      authoredChoiceLabels: ["点头：至少说人话了", "冷笑：后门也算诚实"],
      config: {
        enabled: true,
        rejoinSceneId: "dch01_s004",
        maxAiBeats: 2,
        context: "test",
        artPool: ["bg-office-night"],
        portraitPool: ["suming-panic", "suming-shame"],
      },
    });

    expect(result.rejoinSceneId).toBe("dch01_s004");
    expect(result.choiceLabel.length).toBeGreaterThan(4);
    expect(result.beats.length).toBeGreaterThan(0);
    expect(result.beats.length).toBeLessThanOrEqual(2);
    for (const beat of result.beats) {
      expect(beat.text.length).toBeGreaterThan(8);
    }
  });

  it("ink runner can jump to rejoin knot after side content", async () => {
    const runner = await createInkStoryRunnerForId("draft-ch01");
    const joined = runner.jumpTo("dch01_s010");
    expect(joined.sceneId).toBe("dch01_s010");
    expect(joined.text.length).toBeGreaterThan(0);
  });
});
