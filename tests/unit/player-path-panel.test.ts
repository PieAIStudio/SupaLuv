import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ProjectedPlayerGraph, ProjectedPlayerNode } from "@supaluv/shared/narrative-graph";
import {
  opaqueNarrativeChoiceEdgeId,
  opaqueNarrativeNodeId,
  projectPlayerPath,
} from "@supaluv/shared/narrative-graph";
import { getNarrativeGraphPlayerSkeleton } from "@supaluv/content";
import {
  aiBranchChoiceId,
  type PlayerPathRouteMemory,
} from "../../apps/web/src/persistence/pathMemory";
import {
  buildPlayerPathViewModel,
  resolvePlayerPathTabIndex,
} from "../../apps/web/src/views/PlayerPathPanel";

const VISITED_ID = opaqueNarrativeNodeId("draft-ch01", "scene-a");
const SELECTED_TARGET_ID = opaqueNarrativeNodeId("draft-ch01", "scene-b");
const UNKNOWN_TARGET_ID = opaqueNarrativeNodeId("draft-ch01", "scene-c");
const FUTURE_ID = opaqueNarrativeNodeId("draft-ch01", "scene-future");
const SELECTED_EDGE_ID = opaqueNarrativeChoiceEdgeId("draft-ch01", "choice-a");
const UNSELECTED_EDGE_ID = opaqueNarrativeChoiceEdgeId("draft-ch01", "choice-b");

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
      id: SELECTED_EDGE_ID,
      kind: "choice",
      fromNodeId: VISITED_ID,
      toNodeId: SELECTED_TARGET_ID,
      state: "selected",
      label: "真实选择",
    },
    {
      id: UNSELECTED_EDGE_ID,
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

interface CreatorFixtureNode {
  readonly id: string;
  readonly storyId: string;
  readonly stableSceneId: string;
  readonly title: string;
}

interface CreatorFixtureEdge {
  readonly fromNodeId: string;
  readonly kind: "choice" | "continue" | "chapter_transition";
  readonly stableChoiceId: string | null;
  readonly label: string | null;
}

const creatorFixture = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, "../../packages/content/generated/narrative-graph-creator.json"),
    "utf8",
  ),
) as {
  readonly nodes: readonly CreatorFixtureNode[];
  readonly edges: readonly CreatorFixtureEdge[];
};

function buildRealTwoChapterRoute(): {
  readonly graph: ProjectedPlayerGraph;
  readonly route: PlayerPathRouteMemory;
} {
  const skeleton = getNarrativeGraphPlayerSkeleton();
  const sceneIds = [
    ["draft-ch01", "dch01_s003"],
    ["draft-ch01", "dch01_s006"],
    ["draft-ch01", "dch01_s007"],
    ["draft-ch01", "dch01_s008"],
    ["draft-ch01", "dch01_s009"],
    ["draft-ch01", "dch01_s010"],
    ["draft-ch01", "dch01_s011"],
    ["draft-ch01", "dch01_s012"],
    ["draft-ch01", "dch01_s013"],
    ["draft-ch01", "d1_chapter_end"],
    ["draft-ch02", "dch02_s001"],
    ["draft-ch02", "dch02_s019"],
    ["draft-ch02", "dch02_s020"],
    ["draft-ch02", "dch02_s021"],
    ["draft-ch02", "dch02_s022"],
    ["draft-ch02", "dch02_s023"],
    ["draft-ch02", "dch02_s024"],
    ["draft-ch02", "dch02_s025"],
  ] as const;
  const nodesByScene = new Map(
    creatorFixture.nodes.map((node) => [`${node.storyId}:${node.stableSceneId}`, node]),
  );
  const branchNode = nodesByScene.get("draft-ch01:dch01_s003")!;
  const branchChoices = creatorFixture.edges.filter(
    (edge) => edge.fromNodeId === branchNode.id && edge.kind === "choice" && edge.stableChoiceId,
  );
  const selectedBranch = branchChoices[0]!;
  const unselectedBranch = branchChoices[1]!;
  const base = Date.parse("2026-07-15T01:00:00.000Z");
  const scenes = Object.fromEntries(
    sceneIds.map(([storyId, sceneId], index) => {
      const node = nodesByScene.get(`${storyId}:${sceneId}`)!;
      const observedAt = new Date(base + index * 60_000).toISOString();
      const choices =
        sceneId === "dch01_s003"
          ? [
              {
                choiceId: selectedBranch.stableChoiceId,
                label: selectedBranch.label,
                observedAt,
                selectedAt: observedAt,
              },
              {
                choiceId: unselectedBranch.stableChoiceId,
                label: unselectedBranch.label,
                observedAt,
                selectedAt: null,
              },
            ]
          : [
              ...(sceneId === "dch02_s019"
                ? [
                    {
                      // Same shape the runtime helper writes (not a synthetic ai:* inference).
                      choiceId: aiBranchChoiceId("draft-ch02", "dch02_s019"),
                      label: "AI 旁支",
                      observedAt,
                      selectedAt: observedAt,
                      source: "ai" as const,
                    },
                  ]
                : []),
              ...(() => {
                const continueEdge = creatorFixture.edges.find(
                  (edge) =>
                    edge.fromNodeId === node.id && edge.kind === "continue" && edge.stableChoiceId,
                );
                return continueEdge
                  ? [
                      {
                        choiceId: continueEdge.stableChoiceId,
                        label: continueEdge.label,
                        observedAt,
                        selectedAt: observedAt,
                      },
                    ]
                  : [];
              })(),
            ];
      return [
        `${storyId}:${sceneId}`,
        {
          storyId,
          sceneId,
          title: node.title,
          summary: `${node.title} 的已观察结果。`,
          firstVisitedAt: observedAt,
          lastVisitedAt: observedAt,
          choices,
        },
      ];
    }),
  );
  const route: PlayerPathRouteMemory = {
    packageId: skeleton.packageId,
    revision: skeleton.revision,
    scenes,
    current: {
      storyId: "draft-ch02",
      sceneId: "dch02_s025",
      observedAt: new Date(base + sceneIds.length * 60_000).toISOString(),
    },
  };
  const visitedNodeIds = sceneIds.map(([storyId, sceneId]) => `${storyId}#scene:${sceneId}`);
  const graph = projectPlayerPath(skeleton, {
    visitedNodeIds,
    currentNodeId: "draft-ch02#scene:dch02_s025",
    observedChoices: [
      {
        storyId: "draft-ch01",
        choiceId: selectedBranch.stableChoiceId!,
        label: selectedBranch.label,
      },
      {
        storyId: "draft-ch01",
        choiceId: unselectedBranch.stableChoiceId!,
        label: unselectedBranch.label,
      },
    ],
    selectedChoiceIds: [{ storyId: "draft-ch01", choiceId: selectedBranch.stableChoiceId! }],
    seenSceneLabels: Object.fromEntries(
      sceneIds.map(([storyId, sceneId]) => {
        const node = nodesByScene.get(`${storyId}:${sceneId}`)!;
        return [`${storyId}#scene:${sceneId}`, node.title];
      }),
    ),
  });
  return { graph, route };
}

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
      [SELECTED_EDGE_ID, "selected", "真实选择"],
      [UNSELECTED_EDGE_ID, "available_unselected", "已见但没选"],
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

  it("compresses a real two-chapter player graph while preserving branches, AI, milestones, and current", () => {
    const real = buildRealTwoChapterRoute();
    const view = buildPlayerPathViewModel(real.graph, real.route);

    const longSegment = view.journey.find(
      (item) => item.kind === "segment" && item.entries.length === 8,
    );
    expect(longSegment?.entries.map((entry) => entry.sceneId)).toEqual([
      "dch01_s006",
      "dch01_s007",
      "dch01_s008",
      "dch01_s009",
      "dch01_s010",
      "dch01_s011",
      "dch01_s012",
      "dch01_s013",
    ]);

    const branch = view.journey.find((item) => item.entries[0]?.sceneId === "dch01_s003");
    expect(branch?.kind).toBe("milestone");
    expect(branch?.choices.map((choice) => [choice.selected, choice.source])).toEqual([
      [true, "authored"],
      [false, "authored"],
    ]);

    const ai = view.journey.find((item) => item.entries[0]?.sceneId === "dch02_s019");
    expect(ai).toMatchObject({ kind: "milestone", hasAi: true });
    expect(ai?.choices[0]).toMatchObject({
      source: "ai",
      selected: true,
      choiceId: aiBranchChoiceId("draft-ch02", "dch02_s019"),
      label: "AI 旁支",
    });

    expect(view.journey.find((item) => item.entries[0]?.sceneId === "d1_chapter_end")?.kind).toBe(
      "milestone",
    );
    expect(
      view.journey.find((item) => item.entries[0]?.sceneId === "dch02_s001")?.chapterStart,
    ).toBe(true);
    expect(view.journey.find((item) => item.current)?.entries[0]?.sceneId).toBe("dch02_s025");
    expect(new Set(view.journey.map((item) => item.storyId))).toEqual(
      new Set(["draft-ch01", "draft-ch02"]),
    );
    // Chapter markers must follow graph chapterId, not storyId equality alone.
    const chapterStarts = view.journey.filter((item) => item.chapterStart);
    expect(chapterStarts.map((item) => item.chapterId)).toEqual(
      expect.arrayContaining([
        view.journey.find((item) => item.entries[0]?.sceneId === "dch01_s003")?.chapterId,
        view.journey.find((item) => item.entries[0]?.sceneId === "dch02_s001")?.chapterId,
      ]),
    );
  });

  it("implements the WAI-ARIA tab keyboard index contract with wrapping", () => {
    expect(resolvePlayerPathTabIndex("ArrowRight", 0, 2)).toBe(1);
    expect(resolvePlayerPathTabIndex("ArrowRight", 1, 2)).toBe(0);
    expect(resolvePlayerPathTabIndex("ArrowLeft", 0, 2)).toBe(1);
    expect(resolvePlayerPathTabIndex("ArrowLeft", 1, 2)).toBe(0);
    expect(resolvePlayerPathTabIndex("Home", 1, 2)).toBe(0);
    expect(resolvePlayerPathTabIndex("End", 0, 2)).toBe(1);
    expect(resolvePlayerPathTabIndex("Enter", 0, 2)).toBeNull();
  });

  it("classifies AI choices from explicit source facts, not choiceId prefixes", () => {
    const withSource: PlayerPathRouteMemory = {
      ...route,
      scenes: {
        "draft-ch01:scene-a": {
          ...route.scenes["draft-ch01:scene-a"]!,
          choices: [
            {
              choiceId: "choice-a",
              label: "真实选择",
              observedAt: "2026-07-13T01:00:00.000Z",
              selectedAt: "2026-07-13T01:01:00.000Z",
              source: "authored",
            },
            {
              // Real choice edge, source omitted → authored (not inferred from id).
              choiceId: "choice-b",
              label: "已见但没选",
              observedAt: "2026-07-13T01:00:00.000Z",
              selectedAt: null,
            },
            {
              choiceId: aiBranchChoiceId("draft-ch01", "scene-a"),
              label: "AI 旁支",
              observedAt: "2026-07-13T01:00:00.000Z",
              selectedAt: "2026-07-13T01:02:00.000Z",
              source: "ai",
            },
          ],
        },
      },
    };

    const view = buildPlayerPathViewModel(graph, withSource);
    expect(view.linear[0]?.choices.map((choice) => [choice.choiceId, choice.source])).toEqual([
      ["choice-a", "authored"],
      ["choice-b", "authored"],
      [aiBranchChoiceId("draft-ch01", "scene-a"), "ai"],
    ]);
    expect(view.journey.some((item) => item.hasAi)).toBe(true);
  });

  it("uses chapterId for milestone chapterStart even when storyId is unchanged", () => {
    const sameStoryDifferentChapters: ProjectedPlayerGraph = {
      ...graph,
      nodes: [
        {
          ...visited,
          id: opaqueNarrativeNodeId("draft-ch01", "scene-a"),
          storyId: "draft-ch01",
          chapterId: "chapter-1",
          chapterOrder: 1,
          state: "visited",
        },
        {
          ...visited,
          id: opaqueNarrativeNodeId("draft-ch01", "scene-b"),
          storyId: "draft-ch01",
          chapterId: "chapter-2",
          chapterOrder: 2,
          state: "current",
          label: "第二章同 story",
        },
      ],
      edges: [
        {
          id: "e_continue",
          kind: "continue",
          fromNodeId: opaqueNarrativeNodeId("draft-ch01", "scene-a"),
          toNodeId: opaqueNarrativeNodeId("draft-ch01", "scene-b"),
          state: "selected",
          label: null,
        },
      ],
    };
    const multiChapterRoute: PlayerPathRouteMemory = {
      packageId: graph.packageId,
      revision: graph.revision,
      current: {
        storyId: "draft-ch01",
        sceneId: "scene-b",
        observedAt: "2026-07-13T02:00:00.000Z",
      },
      scenes: {
        "draft-ch01:scene-a": {
          storyId: "draft-ch01",
          sceneId: "scene-a",
          title: "第一章",
          summary: "第一章摘要",
          firstVisitedAt: "2026-07-13T01:00:00.000Z",
          lastVisitedAt: "2026-07-13T01:00:00.000Z",
          choices: [],
        },
        "draft-ch01:scene-b": {
          storyId: "draft-ch01",
          sceneId: "scene-b",
          title: "第二章同 story",
          summary: "第二章摘要",
          firstVisitedAt: "2026-07-13T02:00:00.000Z",
          lastVisitedAt: "2026-07-13T02:00:00.000Z",
          choices: [],
        },
      },
    };

    const view = buildPlayerPathViewModel(sameStoryDifferentChapters, multiChapterRoute);
    expect(view.journey).toHaveLength(2);
    expect(view.journey[0]).toMatchObject({
      chapterId: "chapter-1",
      chapterStart: true,
      storyId: "draft-ch01",
    });
    expect(view.journey[1]).toMatchObject({
      chapterId: "chapter-2",
      chapterStart: true,
      storyId: "draft-ch01",
    });
  });

  it("projects AI facts written through the shared runtime helper, not manual prefix seeds", () => {
    // Shape produced by recordAiBranchSelection (VisualNovelPrototype.handleChooseAi path).
    const helperFact = {
      choiceId: aiBranchChoiceId("draft-ch01", "scene-a"),
      label: "AI 旁支",
      observedAt: "2026-07-13T01:02:00.000Z",
      selectedAt: "2026-07-13T01:02:00.000Z",
      source: "ai" as const,
    };
    expect(helperFact.choiceId).toBe(aiBranchChoiceId("draft-ch01", "scene-a"));
    expect(helperFact.source).toBe("ai");

    const runtimeRoute: PlayerPathRouteMemory = {
      packageId: graph.packageId,
      revision: graph.revision,
      current: route.current,
      scenes: {
        "draft-ch01:scene-a": {
          ...route.scenes["draft-ch01:scene-a"]!,
          choices: [...route.scenes["draft-ch01:scene-a"]!.choices, helperFact],
        },
      },
    };

    const view = buildPlayerPathViewModel(graph, runtimeRoute);
    const aiChoice = view.linear[0]?.choices.find((choice) => choice.source === "ai");
    expect(aiChoice).toMatchObject({
      choiceId: helperFact.choiceId,
      label: "AI 旁支",
      selected: true,
      source: "ai",
    });
    expect(view.journey.some((item) => item.hasAi)).toBe(true);
  });
});
