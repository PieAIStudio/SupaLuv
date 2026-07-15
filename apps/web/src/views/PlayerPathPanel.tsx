import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import dagre from "@dagrejs/dagre";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type ReactFlowInstance,
  type Edge as FlowEdge,
  type Node as FlowNode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { getNarrativeGraphPlayerSkeleton } from "@supaluv/content";
import {
  opaqueNarrativeNodeId,
  projectPlayerPath,
  toOpaqueNarrativeEdgeId,
  type NarrativeEdgeKind,
  type NarrativeNodeKind,
  type ProjectedPlayerGraph,
} from "@supaluv/shared/narrative-graph";
import {
  getPlayerPathObservation,
  getPlayerPathRoute,
  resolveChoiceSource,
  type PlayerPathChoiceSource,
  type PlayerPathRouteMemory,
} from "../persistence/pathMemory";
import { useLocale } from "../i18n";
import "../styles/player-path.css";

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

interface PlayerPathCopy {
  readonly selectedRoute: string;
  readonly seenUnselected: string;
  readonly hiddenRoute: string;
  readonly visitedScene: string;
  readonly currentAria: string;
  readonly visitedAria: string;
  readonly selectedAria: string;
  readonly unselectedAria: string;
}

const DEFAULT_PLAYER_PATH_COPY: PlayerPathCopy = {
  selectedRoute: "已走路线",
  seenUnselected: "已见但未选择",
  hiddenRoute: "未揭示路线",
  visitedScene: "已访问场景",
  currentAria: "当前位置：",
  visitedAria: "已访问：",
  selectedAria: "实际选择：",
  unselectedAria: "已见但未选择：",
};

const PLAYER_PATH_VIEW_MODES = ["journey", "graph"] as const;
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

const skeleton = getNarrativeGraphPlayerSkeleton();
const pathScope = { packageId: skeleton.packageId, revision: skeleton.revision } as const;
const NODE_WIDTH = 184;
const NODE_HEIGHT = 72;

function layoutGraph(
  view: PlayerPathViewModel,
  copy: PlayerPathCopy,
): {
  nodes: FlowNode<{ label: string }>[];
  edges: FlowEdge[];
} {
  const layout = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  layout.setGraph({ rankdir: "LR", ranksep: 84, nodesep: 38, marginx: 28, marginy: 28 });
  for (const node of view.nodes) {
    layout.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of view.edges) {
    layout.setEdge(edge.fromNodeId, edge.toNodeId);
  }
  dagre.layout(layout);

  return {
    nodes: view.nodes.map((node) => {
      const position = layout.node(node.id) as { x: number; y: number } | undefined;
      return {
        id: node.id,
        data: { label: node.label },
        position: {
          x: (position?.x ?? 0) - NODE_WIDTH / 2,
          y: (position?.y ?? 0) - NODE_HEIGHT / 2,
        },
        className: `player-path-node player-path-node--${node.state}`,
        selectable: node.state !== "locked",
        draggable: false,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        ariaLabel:
          node.state === "current"
            ? `${copy.currentAria}${node.label}`
            : node.state === "locked"
              ? copy.hiddenRoute
              : `${copy.visitedAria}${node.label}`,
      };
    }),
    edges: view.edges.map((edge) => ({
      id: edge.id,
      source: edge.fromNodeId,
      target: edge.toNodeId,
      label: edge.label,
      className: `player-path-edge player-path-edge--${edge.state}`,
      animated: edge.state === "selected",
      selectable: false,
      markerEnd: { type: MarkerType.ArrowClosed },
      ariaLabel:
        edge.state === "selected"
          ? `${copy.selectedAria}${edge.label}`
          : `${copy.unselectedAria}${edge.label}`,
    })),
  };
}

function itemTitle(item: PlayerPathJourneyItem): string {
  const first = item.entries[0]!;
  const last = item.entries.at(-1)!;
  return item.kind === "segment" ? `${first.title} → ${last.title}` : first.title;
}

function itemAriaLabel(item: PlayerPathJourneyItem): string {
  const sceneFacts = item.entries
    .map((entry) => [entry.title, entry.summary, ...entry.choices.map((choice) => choice.label)])
    .flat()
    .filter(Boolean)
    .join(". ");
  return `${item.chapterId}. ${sceneFacts}`;
}

interface PlayerPathPanelProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function PlayerPathPanel({ isOpen, onClose }: PlayerPathPanelProps) {
  const { t } = useLocale();
  const copy = useMemo<PlayerPathCopy>(
    () => ({
      selectedRoute: t("playerPath.selectedRoute"),
      seenUnselected: t("playerPath.seenUnselected"),
      hiddenRoute: t("playerPath.hiddenRoute"),
      visitedScene: t("playerPath.visitedScene"),
      currentAria: t("playerPath.currentAria"),
      visitedAria: t("playerPath.visitedAria"),
      selectedAria: t("playerPath.selectedAria"),
      unselectedAria: t("playerPath.unselectedAria"),
    }),
    [t],
  );
  const [viewMode, setViewMode] = useState<PlayerPathViewMode>("journey");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDialogElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const restoreFallbackRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const flowInstanceRef = useRef<ReactFlowInstance<FlowNode<{ label: string }>, FlowEdge> | null>(
    null,
  );
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = panelRef.current;
    if (!isOpen || !dialog) {
      return;
    }

    // Fresh open always starts on the accessible journey review tab.
    setViewMode("journey");
    setSelectedItemId(null);

    const activeElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const systemToggle =
      activeElement
        ?.closest(".system-menu-wrap")
        ?.querySelector<HTMLElement>("button[aria-expanded]") ??
      document.querySelector<HTMLElement>('[data-testid="system-menu-toggle"]');
    // Prefer the durable system-menu control over a transient menu row.
    restoreFocusRef.current = systemToggle ?? activeElement;
    restoreFallbackRef.current = activeElement;

    // Genuine modal: HTMLDialogElement.showModal() — not `open` + aria-modal alone.
    if (!dialog.open) {
      dialog.showModal();
    }

    const focusClose = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    let closing = false;
    const requestClose = () => {
      if (closing) {
        return;
      }
      closing = true;
      // Close while still mounted so the user agent can leave the top layer cleanly.
      if (dialog.open) {
        dialog.close();
      }
      onCloseRef.current();
    };

    const handleCancel = (event: Event) => {
      // Keep React as the single close owner (unmount via isOpen=false).
      event.preventDefault();
      requestClose();
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      // Backup for environments where Escape → cancel is unreliable (e.g. nested focusables).
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        requestClose();
      }
    };
    dialog.addEventListener("cancel", handleCancel);
    // Capture phase so nested widgets (e.g. React Flow) cannot swallow Escape first.
    dialog.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.cancelAnimationFrame(focusClose);
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("keydown", handleKeyDown, true);
      if (dialog.open) {
        dialog.close();
      }
      const restoreTarget = restoreFocusRef.current;
      const fallbackTarget = restoreFallbackRef.current;
      window.setTimeout(() => {
        if (restoreTarget?.isConnected) {
          restoreTarget.focus();
        } else if (fallbackTarget?.isConnected) {
          fallbackTarget.focus();
        }
      }, 0);
      restoreFocusRef.current = null;
      restoreFallbackRef.current = null;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || viewMode !== "graph") {
      return;
    }
    const fit = () => {
      window.requestAnimationFrame(() => {
        void flowInstanceRef.current?.fitView({ padding: 0.2, duration: 0 });
      });
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [isOpen, viewMode]);

  const result = useMemo(() => {
    if (!isOpen) {
      return null;
    }
    const routeResult = getPlayerPathRoute(pathScope);
    if (routeResult.status !== "ready") {
      return { status: routeResult.status, view: null, flow: null } as const;
    }
    const projected = projectPlayerPath(skeleton, getPlayerPathObservation(pathScope));
    const view = buildPlayerPathViewModel(projected, routeResult.memory, copy);
    return { status: "ready", view, flow: layoutGraph(view, copy) } as const;
  }, [copy, isOpen]);

  const selectViewMode = (mode: PlayerPathViewMode, options?: { focus?: boolean }) => {
    setViewMode(mode);
    if (options?.focus) {
      const index = PLAYER_PATH_VIEW_MODES.indexOf(mode);
      window.requestAnimationFrame(() => tabRefs.current[index]?.focus());
    }
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tabIndex: number) => {
    const nextIndex = resolvePlayerPathTabIndex(event.key, tabIndex, PLAYER_PATH_VIEW_MODES.length);
    if (nextIndex === null) {
      return;
    }
    event.preventDefault();
    selectViewMode(PLAYER_PATH_VIEW_MODES[nextIndex]!, { focus: true });
  };

  if (!isOpen) {
    return null;
  }

  const selected =
    result?.status === "ready"
      ? (result.view.journey.find((item) => item.id === selectedItemId) ??
        result.view.journey.find((item) => item.current) ??
        result.view.journey.at(-1) ??
        null)
      : null;

  return (
    <dialog
      ref={panelRef}
      className="player-path-panel"
      aria-labelledby="player-path-title"
      data-testid="player-path-panel"
      data-modal-lifecycle="showModal"
    >
      <header className="player-path-header">
        <div>
          <p className="player-path-eyebrow">{t("playerPath.eyebrow")}</p>
          <h2 id="player-path-title">{t("playerPath.title")}</h2>
          <p>{t("playerPath.lead")}</p>
        </div>
        <button ref={closeButtonRef} type="button" className="player-path-close" onClick={onClose}>
          {t("common.close")}
        </button>
      </header>

      {result?.status === "incompatible" ? (
        <output className="player-path-empty" data-testid="player-path-incompatible">
          {t("playerPath.incompatible")}
        </output>
      ) : result?.status !== "ready" || result.view.linear.length === 0 ? (
        <output className="player-path-empty" data-testid="player-path-empty">
          {t("playerPath.empty")}
        </output>
      ) : (
        <>
          <div className="player-path-tabs" role="tablist" aria-label={t("playerPath.viewModes")}>
            <button
              ref={(element) => {
                tabRefs.current[0] = element;
              }}
              id="player-path-journey-tab"
              type="button"
              role="tab"
              aria-selected={viewMode === "journey"}
              aria-controls="player-path-journey-panel"
              tabIndex={viewMode === "journey" ? 0 : -1}
              onClick={() => selectViewMode("journey")}
              onKeyDown={(event) => handleTabKeyDown(event, 0)}
            >
              {t("playerPath.review")}
            </button>
            <button
              ref={(element) => {
                tabRefs.current[1] = element;
              }}
              id="player-path-graph-tab"
              type="button"
              role="tab"
              aria-selected={viewMode === "graph"}
              aria-controls="player-path-graph-panel"
              tabIndex={viewMode === "graph" ? 0 : -1}
              onClick={() => selectViewMode("graph")}
              onKeyDown={(event) => handleTabKeyDown(event, 1)}
            >
              {t("playerPath.graphTab")}
            </button>
          </div>

          <div className="player-path-content">
            <section
              id="player-path-journey-panel"
              className={
                viewMode === "journey" ? "player-path-journey" : "player-path-journey is-hidden"
              }
              role="tabpanel"
              aria-labelledby="player-path-journey-tab"
              hidden={viewMode !== "journey"}
              data-testid="player-path-journey"
            >
              <ol>
                {result.view.journey.map((item, index) => {
                  const first = item.entries[0]!;
                  const last = item.entries.at(-1)!;
                  const title = itemTitle(item);
                  const preview = first.summary ?? last.summary;
                  const isSelected = selected?.id === item.id;
                  return (
                    <li
                      key={item.id}
                      className={[
                        item.kind === "segment" ? "is-segment" : "is-milestone",
                        item.current ? "is-current" : "",
                        item.hasAi ? "has-ai" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {item.chapterStart ? (
                        <p className="player-path-chapter-marker">
                          <span>{String(item.chapterOrder).padStart(2, "0")}</span>
                          <strong>{item.chapterId}</strong>
                        </p>
                      ) : null}
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={itemAriaLabel(item)}
                        onClick={() => setSelectedItemId(item.id)}
                      >
                        <span className="player-path-step">{index + 1}</span>
                        <span className="player-path-journey-copy">
                          <span className="player-path-badges" aria-hidden="true">
                            {item.kind === "segment" ? (
                              <span>{`${t("playerPath.visited")} · ${item.entries.length}`}</span>
                            ) : null}
                            {item.current ? <span>{t("playerPath.current")}</span> : null}
                            {item.hasAi ? (
                              <span className="is-ai">{t("play.aiBranch")}</span>
                            ) : null}
                            {item.choices.some((choice) => choice.selected) ? (
                              <span>{t("playerPath.selected")}</span>
                            ) : null}
                          </span>
                          <strong className="player-path-clamped" title={title}>
                            {title}
                          </strong>
                          {preview ? (
                            <small className="player-path-clamped" title={preview}>
                              {preview}
                            </small>
                          ) : null}
                        </span>
                      </button>
                      {item.choices.length > 0 ? (
                        <ul aria-label={`${title} ${t("playerPath.choicesAriaSuffix")}`}>
                          {item.choices.map((choice, choiceIndex) => (
                            <li
                              key={`${choice.choiceId ?? "legacy"}-${choiceIndex}`}
                              className={[
                                choice.selected ? "is-selected" : "is-unselected",
                                choice.source === "ai" ? "is-ai" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              title={choice.label}
                            >
                              <span className="player-path-clamped">
                                {choice.source === "ai" ? `${t("play.aiBranch")} · ` : ""}
                                {choice.selected
                                  ? t("playerPath.selected")
                                  : t("playerPath.seen")}{" "}
                                · {choice.label}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </section>

            <section
              id="player-path-graph-panel"
              className={viewMode === "graph" ? "player-path-graph" : "player-path-graph is-hidden"}
              role="tabpanel"
              aria-labelledby="player-path-graph-tab"
              hidden={viewMode !== "graph"}
              data-testid="player-path-graph"
            >
              <ReactFlow
                nodes={result.flow.nodes}
                edges={result.flow.edges}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.35}
                maxZoom={1.6}
                nodesDraggable={false}
                nodesConnectable={false}
                edgesFocusable={false}
                onInit={(instance) => {
                  flowInstanceRef.current = instance;
                }}
                onNodeClick={(_, node) => {
                  const item = result.view.journey.find((candidate) =>
                    candidate.entries.some((entry) => entry.nodeId === node.id),
                  );
                  if (item) {
                    setSelectedItemId(item.id);
                  }
                }}
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={24} size={1} />
                <Controls showInteractive={false} />
              </ReactFlow>
            </section>

            <section
              className="player-path-detail"
              aria-live="polite"
              data-testid="player-path-detail"
            >
              <p className="player-path-detail-kicker">{t("playerPath.review")}</p>
              {selected ? (
                <>
                  <h3>{itemTitle(selected)}</h3>
                  <ol className="player-path-detail-scenes">
                    {selected.entries.map((entry) => (
                      <li key={entry.nodeId}>
                        {selected.entries.length > 1 ? <strong>{entry.title}</strong> : null}
                        <p>{entry.summary ?? t("playerPath.noSummary")}</p>
                      </li>
                    ))}
                  </ol>
                  {selected.choices.length > 0 ? (
                    <ul className="player-path-detail-choices">
                      {selected.choices.map((choice, index) => (
                        <li
                          key={`${choice.choiceId ?? "legacy"}-${index}`}
                          className={[
                            choice.selected ? "is-selected" : "is-unselected",
                            choice.source === "ai" ? "is-ai" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <span>
                            {choice.source === "ai"
                              ? t("play.aiBranch")
                              : choice.selected
                                ? t("playerPath.youSelected")
                                : t("playerPath.alsoSaw")}
                          </span>
                          <strong>{choice.label}</strong>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="player-path-no-jump">{t("playerPath.noJump")}</p>
                </>
              ) : (
                <p>{t("playerPath.selectPrompt")}</p>
              )}
            </section>
          </div>
        </>
      )}
    </dialog>
  );
}
