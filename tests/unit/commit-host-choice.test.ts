import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHOICE_STATS_REMOTE_TIMEOUT_MS,
  resetChoiceStatsRemoteForTesting,
} from "../../apps/web/src/stats/choiceStatsRemote";
import { commitHostChoice } from "../../apps/web/src/views/play/commitHostChoice";
import type { InkStorySnapshot } from "../../apps/web/src/story/inkStoryRunner";
import { getPlayerPathObservation } from "../../apps/web/src/persistence/pathMemory";

const pathScope = { packageId: "draft-2026-07", revision: "revision-a" } as const;

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
  resetChoiceStatsRemoteForTesting();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
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
    const recordPlayerChoice = vi.fn<(text: string) => void>();
    const onChoose = vi.fn<(index: number) => void>();
    const clearVotes = vi.fn<() => void>();

    const result = commitHostChoice({
      storyId: "draft-ch01",
      pathScope,
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
    expect(getPlayerPathObservation(pathScope).selectedChoiceIds).toEqual([
      { storyId: "draft-ch01", choiceId: "left" },
    ]);
  });

  it("still advances when choice index is missing without recording history", () => {
    const recordPlayerChoice = vi.fn<(text: string) => void>();
    const onChoose = vi.fn<(index: number) => void>();

    commitHostChoice({
      storyId: "draft-ch01",
      pathScope,
      snapshot: snapshot({ choices: [] }),
      choiceIndex: 0,
      sessionPicks: [],
      recordPlayerChoice,
      onChoose,
    });

    expect(recordPlayerChoice).not.toHaveBeenCalled();
    expect(onChoose).toHaveBeenCalledWith(0);
  });

  it("advances an authored tracked choice immediately while remote stats hang", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      () => new Promise<Response>(() => undefined),
    );
    vi.stubGlobal("fetch", fetchMock);
    const unhandled = vi.fn<(reason: unknown, promise: Promise<unknown>) => void>();
    process.on("unhandledRejection", unhandled);

    try {
      const onChoose = vi.fn<(index: number) => void>();
      const result = commitHostChoice({
        storyId: "draft-ch01",
        pathScope,
        snapshot: snapshot({
          sceneId: "dch01_s003",
          choices: [
            {
              index: 0,
              text: "冷笑：后门也算诚实",
              choiceId: "d1_bones_cold",
            },
          ],
        }),
        choiceIndex: 0,
        sessionPicks: [],
        recordPlayerChoice: vi.fn<(text: string) => void>(),
        onChoose,
      });

      expect(onChoose).toHaveBeenCalledWith(0);
      expect(result.sessionPicks).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledOnce();

      await vi.advanceTimersByTimeAsync(CHOICE_STATS_REMOTE_TIMEOUT_MS);
      await Promise.resolve();
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", unhandled);
    }
  });
});
