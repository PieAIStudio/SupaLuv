import { describe, expect, it } from "vitest";

describe("inkStoryRunner", () => {
  it("reads the initial prototype scene text and choices", async () => {
    const { createPrototypeInkStoryRunner } =
      await import("../../apps/web/src/story/inkStoryRunner");

    const runner = createPrototypeInkStoryRunner();
    const snapshot = runner.getSnapshot();

    expect(snapshot.sceneId).toBe("act1_office_shame_test");
    expect(snapshot.text).toContain("办公室");
    expect(snapshot.choices.length).toBeGreaterThan(0);
    expect(snapshot.meters.dignity).toBe(50);
    expect(snapshot.meters.impulse).toBe(50);
  });

  it("advances to a new scene after choosing an option", async () => {
    const { createPrototypeInkStoryRunner } =
      await import("../../apps/web/src/story/inkStoryRunner");

    const runner = createPrototypeInkStoryRunner();
    const first = runner.getSnapshot();
    const second = runner.choose(0);

    expect(second.sceneId).not.toBe(first.sceneId);
    expect(second.text).not.toBe(first.text);
  });

  it("mutates comedy meters when impulse-heavy choices are taken", async () => {
    const { createPrototypeInkStoryRunner } =
      await import("../../apps/web/src/story/inkStoryRunner");

    const runner = createPrototypeInkStoryRunner();
    // Screenshot path: impulse up, dignity down, then coworker peek.
    runner.choose(1);
    const afterCoworkerPath = runner.getSnapshot();

    expect(afterCoworkerPath.meters.impulse).toBeGreaterThan(50);
    expect(afterCoworkerPath.meters.dignity).toBeLessThan(50);
  });
});
