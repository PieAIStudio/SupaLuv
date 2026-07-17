import {
  opaqueNarrativeNodeId,
  toOpaqueNarrativeEdgeId,
  type NarrativeEdgeKind,
  type NarrativeNodeKind,
  type ProjectedPlayerGraph,
} from "@supaluv/shared/narrative-graph";
import {
  resolveChoiceSource,
  type PlayerPathChoiceSource,
  type PlayerPathRouteMemory,
} from "../../persistence/pathMemory";

type PlayerPathNodeState = "visited" | "current" | "locked";

export interface PlayerPathViewNode {
  readonly id: string;
  readonly label: string;
  readonly state: PlayerPathNodeState;
  readonly storyId: string;
  readonly chapterId: string;
}

export interface PlayerPathViewEdge {
  readonly id: string;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly kind: NarrativeEdgeKind;
  readonly label: string;
  readonly state: "selected" | "available_unselected";
}

export interface PlayerPathLinearChoice {
  readonly choiceId: string | null;
  readonly label: string;
  readonly selected: boolean;
  readonly source: PlayerPathChoiceSource;
}

export interface PlayerPathLinearEntry {
  readonly nodeId: string;
  readonly storyId: string;
  readonly sceneId: string;
  readonly chapterId: string;
  readonly chapterOrder: number;
  readonly nodeKind: NarrativeNodeKind;
  readonly title: string;
  readonly summary: string | null;
  readonly firstVisitedAt: string;
  readonly current: boolean;
  readonly choices: readonly PlayerPathLinearChoice[];
}

export interface PlayerPathJourneyItem {
  readonly id: string;
  readonly kind: "milestone" | "segment";
  readonly storyId: string;
  readonly chapterId: string;
  readonly chapterOrder: number;
  readonly chapterStart: boolean;
  readonly entries: readonly PlayerPathLinearEntry[];
  readonly current: boolean;
  readonly hasAi: boolean;
  readonly choices: readonly PlayerPathLinearChoice[];
}

export interface PlayerPathViewModel {
  readonly nodes: readonly PlayerPathViewNode[];
  readonly edges: readonly PlayerPathViewEdge[];
  readonly linear: readonly PlayerPathLinearEntry[];
  readonly journey: readonly PlayerPathJourneyItem[];
}

export interface PlayerPathCopy {
  readonly selectedRoute: string;
  readonly seenUnselected: string;
  readonly hiddenRoute: string;
  readonly visitedScene: string;
  readonly currentAria: string;
  readonly visitedAria: string;
  readonly selectedAria: string;
  readonly unselectedAria: string;
}

export const DEFAULT_PLAYER_PATH_COPY: PlayerPathCopy = {
  selectedRoute: "已走路线",
  seenUnselected: "已见但未选择",
  hiddenRoute: "未揭示路线",
  visitedScene: "已访问场景",
  currentAria: "当前位置：",
  visitedAria: "已访问：",
  selectedAria: "实际选择：",
  unselectedAria: "已见但未选择：",
};

export const PLAYER_PATH_VIEW_MODES = ["journey", "graph"] as const;
export type PlayerPathViewMode = (typeof PLAYER_PATH_VIEW_MODES)[number];

/**
 * WAI-ARIA Tabs keyboard contract: ArrowLeft/Right (wrap), Home, End.
 * Returns the next selected tab index, or null when the key is not handled.
 */
export function resolvePlayerPathTabIndex(
  key: string,
  currentIndex: number,
  tabCount: number = PLAYER_PATH_VIEW_MODES.length,
): number | null {
  if (tabCount <= 0) {
    return null;
  }
  const safeIndex = ((currentIndex % tabCount) + tabCount) % tabCount;
  switch (key) {
    case "ArrowRight":
      return (safeIndex + 1) % tabCount;
    case "ArrowLeft":
      return (safeIndex - 1 + tabCount) % tabCount;
    case "Home":
      return 0;
    case "End":
      return tabCount - 1;
    default:
      return null;
  }
}

function isChapterBoundary(
  previous: PlayerPathLinearEntry | undefined,
  entry: PlayerPathLinearEntry,
): boolean {
  // Graph/schema chapterId is authoritative — never compare storyId for chapter starts.
  return !previous || previous.chapterId !== entry.chapterId;
}

function journeyItemForEntry(
  entry: PlayerPathLinearEntry,
  chapterStart: boolean,
): PlayerPathJourneyItem {
  return {
    id: `milestone:${entry.nodeId}`,
    kind: "milestone",
    storyId: entry.storyId,
    chapterId: entry.chapterId,
    chapterOrder: entry.chapterOrder,
    chapterStart,
    entries: [entry],
    current: entry.current,
    hasAi: entry.choices.some((choice) => choice.source === "ai"),
    choices: entry.choices,
  };
}

function buildJourney(
  graph: ProjectedPlayerGraph,
  linear: readonly PlayerPathLinearEntry[],
): readonly PlayerPathJourneyItem[] {
  const structuralContinue = new Set(
    graph.edges
      .filter((edge) => edge.kind === "continue")
      .map((edge) => `${edge.fromNodeId}->${edge.toNodeId}`),
  );

  const isMilestone = (entry: PlayerPathLinearEntry, index: number): boolean => {
    const chapterStart = isChapterBoundary(linear[index - 1], entry);
    return chapterStart || entry.current || entry.nodeKind !== "scene" || entry.choices.length > 0;
  };

  const items: PlayerPathJourneyItem[] = [];
  let index = 0;
  while (index < linear.length) {
    const entry = linear[index]!;
    const chapterStart = isChapterBoundary(linear[index - 1], entry);
    if (isMilestone(entry, index)) {
      items.push(journeyItemForEntry(entry, chapterStart));
      index += 1;
      continue;
    }

    const entries = [entry];
    let cursor = index;
    while (cursor + 1 < linear.length) {
      const current = linear[cursor]!;
      const next = linear[cursor + 1]!;
      if (
        next.chapterId !== entry.chapterId ||
        isMilestone(next, cursor + 1) ||
        !structuralContinue.has(`${current.nodeId}->${next.nodeId}`)
      ) {
        break;
      }
      entries.push(next);
      cursor += 1;
    }

    if (entries.length === 1) {
      items.push(journeyItemForEntry(entry, chapterStart));
    } else {
      const first = entries[0]!;
      const last = entries.at(-1)!;
      items.push({
        id: `segment:${first.nodeId}:${last.nodeId}`,
        kind: "segment",
        storyId: first.storyId,
        chapterId: first.chapterId,
        chapterOrder: first.chapterOrder,
        chapterStart,
        entries,
        current: entries.some((candidate) => candidate.current),
        hasAi: entries.some((candidate) =>
          candidate.choices.some((choice) => choice.source === "ai"),
        ),
        choices: entries.flatMap((candidate) => candidate.choices),
      });
    }
    index = cursor + 1;
  }

  return items;
}

export function buildPlayerPathViewModel(
  graph: ProjectedPlayerGraph,
  route: PlayerPathRouteMemory,
  copy: PlayerPathCopy = DEFAULT_PLAYER_PATH_COPY,
): PlayerPathViewModel {
  const visibleEdges: PlayerPathViewEdge[] = graph.edges
    .filter(
      (edge): edge is typeof edge & { state: "selected" | "available_unselected" } =>
        edge.state !== "hidden",
    )
    .map((edge) => ({
      id: edge.id,
      fromNodeId: edge.fromNodeId,
      toNodeId: edge.toNodeId,
      kind: edge.kind,
      label: edge.label ?? (edge.state === "selected" ? copy.selectedRoute : copy.seenUnselected),
      state: edge.state,
    }));

  const revealedNodeIds = new Set<string>();
  for (const node of graph.nodes) {
    if (node.state !== "hidden") {
      revealedNodeIds.add(node.id);
    }
  }
  for (const edge of visibleEdges) {
    revealedNodeIds.add(edge.fromNodeId);
    revealedNodeIds.add(edge.toNodeId);
  }

  const nodes: PlayerPathViewNode[] = graph.nodes
    .filter((node) => revealedNodeIds.has(node.id))
    .map((node) => ({
      id: node.id,
      label: node.state === "hidden" ? copy.hiddenRoute : (node.label ?? copy.visitedScene),
      state: node.state === "hidden" ? "locked" : node.state,
      storyId: node.storyId,
      chapterId: node.chapterId,
    }));

  const graphNodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const graphEdges = new Map(graph.edges.map((edge) => [edge.id, edge]));
  const linear = Object.values(route.scenes)
    .map<PlayerPathLinearEntry | null>((scene) => {
      const nodeId = opaqueNarrativeNodeId(scene.storyId, scene.sceneId);
      const graphNode = graphNodes.get(nodeId);
      if (!graphNode || graphNode.state === "hidden") {
        return null;
      }
      return {
        nodeId,
        storyId: scene.storyId,
        sceneId: scene.sceneId,
        chapterId: graphNode.chapterId,
        chapterOrder: graphNode.chapterOrder,
        nodeKind: graphNode.kind,
        title: scene.title ?? copy.visitedScene,
        summary: scene.summary,
        firstVisitedAt: scene.firstVisitedAt,
        current:
          route.current?.storyId === scene.storyId && route.current.sceneId === scene.sceneId,
        choices: scene.choices.flatMap((choice) => {
          if (!choice.label) {
            return [];
          }
          // Explicit fact source is authoritative (legacy missing source → authored).
          const source = resolveChoiceSource(choice.source);
          const edgeId = choice.choiceId
            ? toOpaqueNarrativeEdgeId(choice.choiceId, { storyId: scene.storyId })
            : null;
          const edge = edgeId ? graphEdges.get(edgeId) : null;
          // AI facts are not authored graph choice edges; authored continue edges stay out.
          if (source !== "ai" && choice.choiceId && edge?.kind !== "choice") {
            return [];
          }
          return [
            {
              choiceId: choice.choiceId,
              label: choice.label,
              selected: Boolean(choice.selectedAt),
              source,
            },
          ];
        }),
      };
    })
    .filter((entry): entry is PlayerPathLinearEntry => entry !== null)
    .sort((a, b) => a.firstVisitedAt.localeCompare(b.firstVisitedAt));

  return { nodes, edges: visibleEdges, linear, journey: buildJourney(graph, linear) };
}
