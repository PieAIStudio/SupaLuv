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
});
