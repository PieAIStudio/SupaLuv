import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ProjectedPlayerGraph, ProjectedPlayerNode } from "@supaluv/shared/narrative-graph";
import { opaqueNarrativeNodeId } from "@supaluv/shared/narrative-graph";
import type { PlayerPathRouteMemory } from "../../apps/web/src/persistence/pathMemory";
import { buildPlayerPathViewModel } from "../../apps/web/src/views/PlayerPathPanel";

const VISITED_ID = opaqueNarrativeNodeId("draft-ch01", "scene-a");
const SELECTED_TARGET_ID = opaqueNarrativeNodeId("draft-ch01", "scene-b");
const UNKNOWN_TARGET_ID = opaqueNarrativeNodeId("draft-ch01", "scene-c");
const FUTURE_ID = opaqueNarrativeNodeId("draft-ch01", "scene-future");

const visited: ProjectedPlayerNode = {
  id: VISITED_ID,
  storyId: "draft-ch01",
  chapterId: "chapter-1",
  chapterOrder: 1,
  kind: "scene",
  state: "current",
  label: "已见场景",
  excerpt: "已见短回顾",
};

const graph: ProjectedPlayerGraph = {
  schemaVersion: 1,
  packageId: "draft-2026-07",
  revision: "revision-a",
  nodes: [
    visited,
    {
      ...visited,
      id: SELECTED_TARGET_ID,
      state: "visited",
      label: "已走节点",
      excerpt: null,
    },
    {
      ...visited,
      id: UNKNOWN_TARGET_ID,
      state: "hidden",
      label: null,
      excerpt: null,
    },
    {
      ...visited,
      id: FUTURE_ID,
      state: "hidden",
      label: null,
      excerpt: null,
    },
  ],
  edges: [
    {
      id: "e_selected",
      kind: "choice",
      fromNodeId: VISITED_ID,
      toNodeId: SELECTED_TARGET_ID,
      state: "selected",
      label: "真实选择",
    },
    {
      id: "e_seen_unselected",
      kind: "choice",
      fromNodeId: VISITED_ID,
      toNodeId: UNKNOWN_TARGET_ID,
      state: "available_unselected",
      label: "已见但没选",
    },
    {
      id: "e_future",
      kind: "choice",
      fromNodeId: FUTURE_ID,
      toNodeId: UNKNOWN_TARGET_ID,
      state: "hidden",
      label: null,
    },
  ],
  entryNodeIds: [VISITED_ID],
  terminalNodeIds: [],
};

const route: PlayerPathRouteMemory = {
  packageId: graph.packageId,
  revision: graph.revision,
  current: {
    storyId: "draft-ch01",
    sceneId: "scene-a",
    observedAt: "2026-07-13T01:00:00.000Z",
  },
  scenes: {
    "draft-ch01:scene-a": {
      storyId: "draft-ch01",
      sceneId: "scene-a",
      title: "已见场景",
      summary: "已见短回顾",
      firstVisitedAt: "2026-07-13T01:00:00.000Z",
      lastVisitedAt: "2026-07-13T01:00:00.000Z",
      choices: [
        {
          choiceId: "choice-a",
          label: "真实选择",
          observedAt: "2026-07-13T01:00:00.000Z",
          selectedAt: "2026-07-13T01:01:00.000Z",
        },
        {
          choiceId: "choice-b",
          label: "已见但没选",
          observedAt: "2026-07-13T01:00:00.000Z",
          selectedAt: null,
        },
      ],
    },
  },
};

describe("PlayerPathPanel view model", () => {
  it("imports only the production player skeleton and shared projection", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "../../apps/web/src/views/PlayerPathPanel.tsx"),
      "utf8",
    );

    expect(source).toContain("getNarrativeGraphPlayerSkeleton");
    expect(source).toContain("projectPlayerPath");
    expect(source).not.toContain("narrative-graph-creator");
    expect(source).not.toContain("loadNarrativeGraphCreator");
    expect(source).not.toContain("StoryMapPreview");
  });

  it("keeps selected and seen-unselected edges distinct while omitting wholly unknown branches", () => {
    const view = buildPlayerPathViewModel(graph, route);

    expect(view.nodes.map((node) => [node.id, node.state])).toEqual([
      [VISITED_ID, "current"],
      [SELECTED_TARGET_ID, "visited"],
      [UNKNOWN_TARGET_ID, "locked"],
    ]);
    expect(view.edges.map((edge) => [edge.id, edge.state, edge.label])).toEqual([
      ["e_selected", "selected", "真实选择"],
      ["e_seen_unselected", "available_unselected", "已见但没选"],
    ]);
    expect(view.nodes.some((node) => node.id === FUTURE_ID)).toBe(false);
    expect(view.edges.some((edge) => edge.id === "e_future")).toBe(false);
  });

  it("creates an accessible linear route from visited facts only", () => {
    const view = buildPlayerPathViewModel(graph, route);

    expect(view.linear).toEqual([
      expect.objectContaining({
        title: "已见场景",
        summary: "已见短回顾",
        choices: [
          expect.objectContaining({ label: "真实选择", selected: true }),
          expect.objectContaining({ label: "已见但没选", selected: false }),
        ],
      }),
    ]);
  });

  it("never carries unknown future prose into React Flow node data or the linear list", () => {
    const futureSentinel = "FUTURE_SENTINEL_MUST_NOT_LEAK";
    const view = buildPlayerPathViewModel(graph, route);
    const serialized = JSON.stringify(view);

    expect(serialized).not.toContain(futureSentinel);
    expect(view.nodes.find((node) => node.state === "locked")?.label).toBe("未揭示路线");
  });
});
