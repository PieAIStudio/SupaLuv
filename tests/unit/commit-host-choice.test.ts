import { beforeEach, describe, expect, it, vi } from "vitest";
import { commitHostChoice } from "../../apps/web/src/views/play/commitHostChoice";
import type { InkStorySnapshot } from "../../apps/web/src/story/inkStoryRunner";

const memory = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
    clear: () => memory.clear(),
  },
});

beforeEach(() => {
  memory.clear();
});

function snapshot(partial: Partial<InkStorySnapshot> = {}): InkStorySnapshot {
  return {
    sceneId: "scene-a",
    text: "对白",
    choices: [
      { index: 0, text: "继续", choiceId: null },
      { index: 1, text: "左转", choiceId: "left" },
    ],
    meters: { dignity: 50, impulse: 50 },
    tags: [],
    isEnded: false,
    ...partial,
  };
}

describe("commitHostChoice", () => {
  it("records player choice via narrative command then advances Ink", () => {
    const recordPlayerChoice = vi.fn();
    const onChoose = vi.fn();
    const clearVotes = vi.fn();

    const result = commitHostChoice({
      storyId: "draft-ch01",
      snapshot: snapshot(),
      choiceIndex: 1,
      sessionPicks: [],
      recordPlayerChoice,
      onChoose,
      clearVotes,
    });

    expect(recordPlayerChoice).toHaveBeenCalledWith("左转");
    expect(onChoose).toHaveBeenCalledWith(1);
    expect(clearVotes).toHaveBeenCalledOnce();
    expect(result.sessionPicks).toEqual([]);
  });

  it("still advances when choice index is missing without recording history", () => {
    const recordPlayerChoice = vi.fn();
    const onChoose = vi.fn();

    commitHostChoice({
      storyId: "draft-ch01",
      snapshot: snapshot({ choices: [] }),
      choiceIndex: 0,
      sessionPicks: [],
      recordPlayerChoice,
      onChoose,
    });

    expect(recordPlayerChoice).not.toHaveBeenCalled();
    expect(onChoose).toHaveBeenCalledWith(0);
  });
});
