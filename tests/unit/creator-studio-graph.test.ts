import { describe, expect, it } from "vitest";
import type { NarrativeGraphCreator } from "@supaluv/shared/narrative-graph";
import {
  analyzeCreatorGraph,
  findShortestPath,
  layoutCreatorGraph,
} from "../../apps/web/src/creator/graphModel";

function fixtureGraph(): NarrativeGraphCreator {
  return {
    schemaVersion: 1,
    packageId: "fixture",
    revision: "fixture-revision",
    nodes: [
      {
        id: "chapter#scene:a",
        storyId: "chapter",
        chapterId: "chapter",
        chapterOrder: 1,
        kind: "entry",
        stableSceneId: "a",
        title: "A",
        excerpt: "A",
        sourceRange: { file: "packages/content/ink/chapter.ink", startLine: 1, endLine: 2 },
        dialogueLines: [],
      },
      {
        id: "chapter#scene:b",
        storyId: "chapter",
        chapterId: "chapter",
        chapterOrder: 1,
        kind: "scene",
        stableSceneId: "b",
        title: "B",
        excerpt: "B",
        sourceRange: { file: "packages/content/ink/chapter.ink", startLine: 3, endLine: 4 },
        dialogueLines: [],
      },
      {
        id: "chapter#scene:c",
        storyId: "chapter",
        chapterId: "chapter",
        chapterOrder: 1,
        kind: "terminal",
        stableSceneId: "c",
        title: "C",
        excerpt: "C",
        sourceRange: { file: "packages/content/ink/chapter.ink", startLine: 5, endLine: 6 },
        dialogueLines: [],
      },
      {
        id: "chapter#scene:orphan",
        storyId: "chapter",
        chapterId: "chapter",
        chapterOrder: 1,
        kind: "scene",
        stableSceneId: "orphan",
        title: "Orphan",
        excerpt: "Orphan",
        sourceRange: { file: "packages/content/ink/chapter.ink", startLine: 7, endLine: 8 },
        dialogueLines: [],
      },
    ],
    edges: [
      {
        id: "edge:a-b",
        kind: "continue",
        fromNodeId: "chapter#scene:a",
        toNodeId: "chapter#scene:b",
        stableChoiceId: "a_b",
        label: "next",
        sourceRange: null,
      },
      {
        id: "edge:b-c",
        kind: "choice",
        fromNodeId: "chapter#scene:b",
        toNodeId: "chapter#scene:c",
        stableChoiceId: "b_c",
        label: "finish",
        sourceRange: null,
      },
      {
        id: "edge:broken",
        kind: "choice",
        fromNodeId: "chapter#scene:b",
        toNodeId: "chapter#scene:missing",
        stableChoiceId: "broken",
        label: "void",
        sourceRange: null,
      },
    ],
    entryNodeIds: ["chapter#scene:a"],
    terminalNodeIds: ["chapter#scene:c"],
  };
}

describe("Creator Studio graph analysis", () => {
  it("separates unreachable nodes, dead ends, and broken edges", () => {
    const analysis = analyzeCreatorGraph(fixtureGraph());

    expect([...analysis.unreachableNodeIds]).toEqual(["chapter#scene:orphan"]);
    expect([...analysis.deadEndNodeIds]).toEqual(["chapter#scene:orphan"]);
    expect([...analysis.brokenEdgeIds]).toEqual(["edge:broken"]);
    expect(analysis.inboundByNode.get("chapter#scene:b")?.map((edge) => edge.id)).toEqual([
      "edge:a-b",
    ]);
    expect(analysis.outboundByNode.get("chapter#scene:b")?.map((edge) => edge.id)).toEqual([
      "edge:b-c",
      "edge:broken",
    ]);
  });

  it("finds a deterministic shortest path from an entry to a selected node", () => {
    const path = findShortestPath(fixtureGraph(), "chapter#scene:c");

    expect(path).toEqual({
      nodeIds: ["chapter#scene:a", "chapter#scene:b", "chapter#scene:c"],
      edgeIds: ["edge:a-b", "edge:b-c"],
    });
  });

  it("returns stable Dagre positions for the same graph", () => {
    const first = layoutCreatorGraph(fixtureGraph());
    const second = layoutCreatorGraph(fixtureGraph());

    expect(second).toEqual(first);
    expect(Object.keys(first)).toEqual([
      "chapter#scene:a",
      "chapter#scene:b",
      "chapter#scene:c",
      "chapter#scene:orphan",
    ]);
    expect(first["chapter#scene:a"]!.x).toBeLessThan(first["chapter#scene:c"]!.x);
  });
});
