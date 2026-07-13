import { beforeEach, describe, expect, it } from "vitest";
import {
  PATH_MEMORY_KEY,
  PATH_MEMORY_V1_KEY,
  getPlayerPathObservation,
  getPlayerPathRoute,
  getScenePathMemory,
  recordChoiceSelected,
  recordScenePresented,
  wasChoiceTaken,
  type PlayerPathScope,
} from "../../apps/web/src/persistence/pathMemory";

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  },
});

const scope: PlayerPathScope = {
  packageId: "draft-2026-07",
  revision: "revision-a",
};

beforeEach(() => storage.clear());

describe("path memory v2", () => {
  it("migrates v1 selected choices into the active story revision without inventing prose", () => {
    storage.set(
      PATH_MEMORY_V1_KEY,
      JSON.stringify({
        "draft-ch01:scene-a": ["id:choice-a", "label:旧标签"],
      }),
    );

    const route = getPlayerPathRoute(scope);

    expect(route.status).toBe("ready");
    expect(route.memory?.scenes["draft-ch01:scene-a"]).toMatchObject({
      storyId: "draft-ch01",
      sceneId: "scene-a",
      title: null,
      summary: null,
    });
    expect(route.memory?.scenes["draft-ch01:scene-a"]?.choices).toEqual([
      expect.objectContaining({
        choiceId: "choice-a",
        label: null,
        selectedAt: expect.any(String),
      }),
      expect.objectContaining({ choiceId: null, label: "旧标签", selectedAt: expect.any(String) }),
    ]);
    expect(storage.has(PATH_MEMORY_V1_KEY)).toBe(false);
    expect(storage.has(PATH_MEMORY_KEY)).toBe(true);
  });

  it("keeps the existing NG+ choice surface compatible before scoped migration runs", () => {
    storage.set(
      PATH_MEMORY_V1_KEY,
      JSON.stringify({
        "draft-ch01:scene-a": ["id:choice-a", "label:旧标签"],
      }),
    );

    expect(getScenePathMemory("draft-ch01", "scene-a")).toEqual(["id:choice-a", "label:旧标签"]);
    expect(wasChoiceTaken("draft-ch01", "scene-a", "新标点", "choice-a")).toBe(true);
    expect(wasChoiceTaken("draft-ch01", "scene-a", "旧标签", null)).toBe(true);
  });

  it("keeps repeated scene presentation idempotent and preserves first-seen copy", () => {
    recordScenePresented(scope, {
      storyId: "draft-ch01",
      sceneId: "scene-a",
      title: "首次标题",
      summary: "首次短回顾",
      choices: [{ choiceId: "choice-a", label: "先走左边" }],
      observedAt: "2026-07-13T01:00:00.000Z",
    });
    recordScenePresented(scope, {
      storyId: "draft-ch01",
      sceneId: "scene-a",
      title: "标点变化！",
      summary: "后来文字",
      choices: [{ choiceId: "choice-a", label: "先走左边！" }],
      observedAt: "2026-07-13T01:05:00.000Z",
    });

    const scene = getPlayerPathRoute(scope).memory?.scenes["draft-ch01:scene-a"];
    expect(scene).toMatchObject({
      title: "首次标题",
      summary: "首次短回顾",
      firstVisitedAt: "2026-07-13T01:00:00.000Z",
      lastVisitedAt: "2026-07-13T01:05:00.000Z",
    });
    expect(scene?.choices).toEqual([
      expect.objectContaining({
        choiceId: "choice-a",
        label: "先走左边",
        observedAt: "2026-07-13T01:00:00.000Z",
        selectedAt: null,
      }),
    ]);
  });

  it("records observed choices before a host selection and only then marks the chosen edge", () => {
    recordScenePresented(scope, {
      storyId: "draft-ch01",
      sceneId: "scene-a",
      choices: [
        { choiceId: "choice-a", label: "左边" },
        { choiceId: "choice-b", label: "右边" },
      ],
      observedAt: "2026-07-13T01:00:00.000Z",
    });

    expect(getPlayerPathObservation(scope).observedChoices).toEqual([
      { storyId: "draft-ch01", choiceId: "choice-a", label: "左边" },
      { storyId: "draft-ch01", choiceId: "choice-b", label: "右边" },
    ]);
    expect(getPlayerPathObservation(scope).selectedChoiceIds).toEqual([]);

    recordChoiceSelected(scope, {
      storyId: "draft-ch01",
      sceneId: "scene-a",
      choiceId: "choice-a",
      label: "左边",
      selectedAt: "2026-07-13T01:01:00.000Z",
    });

    expect(getPlayerPathObservation(scope).selectedChoiceIds).toEqual([
      { storyId: "draft-ch01", choiceId: "choice-a" },
    ]);
  });

  it("gives auto-continue an explicit observed-then-selected lifecycle", () => {
    recordScenePresented(scope, {
      storyId: "draft-ch01",
      sceneId: "auto-scene",
      choices: [{ choiceId: "auto-continue", label: "继续" }],
      observedAt: "2026-07-13T02:00:00.000Z",
    });
    expect(getPlayerPathObservation(scope).selectedChoiceIds).toEqual([]);

    recordChoiceSelected(scope, {
      storyId: "draft-ch01",
      sceneId: "auto-scene",
      choiceId: "auto-continue",
      label: "继续",
      selectedAt: "2026-07-13T02:00:01.000Z",
    });
    expect(getPlayerPathObservation(scope).selectedChoiceIds).toEqual([
      { storyId: "draft-ch01", choiceId: "auto-continue" },
    ]);
  });

  it("restores persisted facts and keeps cross-chapter visits in one package route", () => {
    recordScenePresented(scope, {
      storyId: "draft-ch01",
      sceneId: "chapter-one-end",
      title: "第一章终点",
      observedAt: "2026-07-13T03:00:00.000Z",
    });
    recordScenePresented(scope, {
      storyId: "draft-ch02",
      sceneId: "chapter-two-entry",
      title: "第二章入口",
      observedAt: "2026-07-13T03:01:00.000Z",
    });

    const restored = getPlayerPathRoute(scope).memory;
    expect(Object.values(restored?.scenes ?? {}).map((scene) => scene.storyId)).toEqual([
      "draft-ch01",
      "draft-ch02",
    ]);
    expect(restored?.current).toMatchObject({
      storyId: "draft-ch02",
      sceneId: "chapter-two-entry",
    });
  });

  it("uses stable choice ids across punctuation edits instead of hashing display copy", () => {
    recordScenePresented(scope, {
      storyId: "draft-ch01",
      sceneId: "scene-a",
      choices: [{ choiceId: "choice-stable", label: "你确定吗？" }],
    });
    recordChoiceSelected(scope, {
      storyId: "draft-ch01",
      sceneId: "scene-a",
      choiceId: "choice-stable",
      label: "你确定吗!",
    });

    const scene = getPlayerPathRoute(scope).memory?.scenes["draft-ch01:scene-a"];
    expect(scene?.choices).toHaveLength(1);
    expect(scene?.choices[0]).toMatchObject({
      choiceId: "choice-stable",
      label: "你确定吗？",
      selectedAt: expect.any(String),
    });
  });

  it("safely degrades incompatible story revisions instead of projecting a fake route", () => {
    recordScenePresented(scope, {
      storyId: "draft-ch01",
      sceneId: "scene-a",
      title: "只属于旧版本",
    });

    const incompatible = getPlayerPathRoute({ ...scope, revision: "revision-b" });
    expect(incompatible).toEqual({ status: "incompatible", memory: null });
    expect(getPlayerPathObservation({ ...scope, revision: "revision-b" })).toEqual({
      visitedNodeIds: [],
      currentNodeId: null,
      observedChoices: [],
      selectedChoiceIds: [],
      seenSceneLabels: {},
      seenSceneExcerpts: {},
    });
  });

  it("stores only observed copy and never serializes unknown future prose", () => {
    const futureSentinel = "FUTURE_SENTINEL_MUST_NOT_LEAK";
    recordScenePresented(scope, {
      storyId: "draft-ch01",
      sceneId: "scene-a",
      title: "已见标题",
      summary: "已见摘要",
      choices: [{ choiceId: "choice-a", label: "已见选择" }],
    });

    const serialized = storage.get(PATH_MEMORY_KEY) ?? "";
    expect(serialized).toContain("已见标题");
    expect(serialized).toContain("已见摘要");
    expect(serialized).toContain("已见选择");
    expect(serialized).not.toContain(futureSentinel);
  });
});
