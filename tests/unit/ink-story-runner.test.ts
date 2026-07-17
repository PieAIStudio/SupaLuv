import { describe, expect, it } from "vitest";

describe("inkStoryRunner", () => {
  it("reads the initial prototype scene text and choices", async () => {
    const { createPrototypeInkStoryRunner } =
      await import("../../apps/web/src/story/inkStoryRunner");

    const runner = await createPrototypeInkStoryRunner();
    const snapshot = runner.getSnapshot();

    expect(snapshot.sceneId).toBe("act1_office_shame_test");
    expect(snapshot.text).toContain("办公室");
    expect(snapshot.choices.length).toBeGreaterThan(0);
    expect(snapshot.meters.mianzi).toBe(50);
    expect(snapshot.meters.ai_score).toBe(50);
  });

  it("advances to a new scene after choosing an option", async () => {
    const { createPrototypeInkStoryRunner } =
      await import("../../apps/web/src/story/inkStoryRunner");

    const runner = await createPrototypeInkStoryRunner();
    const first = runner.getSnapshot();
    const second = runner.choose(0);

    expect(second.sceneId).not.toBe(first.sceneId);
    expect(second.text).not.toBe(first.text);
  });

  it("mutates comedy meters when ai_score-heavy choices are taken", async () => {
    const { createPrototypeInkStoryRunner } =
      await import("../../apps/web/src/story/inkStoryRunner");

    const runner = await createPrototypeInkStoryRunner();
    // Screenshot path: ai_score up, mianzi down, then coworker peek.
    runner.choose(1);
    const afterCoworkerPath = runner.getSnapshot();

    expect(afterCoworkerPath.meters.ai_score).toBeGreaterThan(50);
    expect(afterCoworkerPath.meters.mianzi).toBeLessThan(50);
  });

  it("loads draft-ch01 from precompiled JSON with stable choice ids", async () => {
    const { createDraftCh01InkStoryRunner } =
      await import("../../apps/web/src/story/inkStoryRunner");
    const runner = await createDraftCh01InkStoryRunner();
    const snapshot = runner.getSnapshot();
    expect(snapshot.sceneId?.startsWith("dch01_")).toBe(true);
    expect(snapshot.choices[0]?.choiceId).toBeTruthy();
  });
});
