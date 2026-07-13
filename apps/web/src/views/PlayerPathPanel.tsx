import { useEffect, useMemo, useRef, useState } from "react";
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
  type ProjectedPlayerGraph,
} from "@supaluv/shared/narrative-graph";
import {
  getPlayerPathObservation,
  getPlayerPathRoute,
  type PlayerPathRouteMemory,
} from "../persistence/pathMemory";
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
  readonly label: string;
  readonly state: "selected" | "available_unselected";
}

export interface PlayerPathLinearChoice {
  readonly choiceId: string | null;
  readonly label: string;
  readonly selected: boolean;
}

export interface PlayerPathLinearEntry {
  readonly nodeId: string;
  readonly storyId: string;
  readonly sceneId: string;
  readonly title: string;
  readonly summary: string | null;
  readonly firstVisitedAt: string;
  readonly current: boolean;
  readonly choices: readonly PlayerPathLinearChoice[];
}

export interface PlayerPathViewModel {
  readonly nodes: readonly PlayerPathViewNode[];
  readonly edges: readonly PlayerPathViewEdge[];
  readonly linear: readonly PlayerPathLinearEntry[];
}

export function buildPlayerPathViewModel(
  graph: ProjectedPlayerGraph,
  route: PlayerPathRouteMemory,
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
      label: edge.label ?? (edge.state === "selected" ? "已走路线" : "已见但未选择"),
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
      label: node.state === "hidden" ? "未揭示路线" : (node.label ?? "已访问场景"),
      state: node.state === "hidden" ? "locked" : node.state,
      storyId: node.storyId,
      chapterId: node.chapterId,
    }));

  const linear = Object.values(route.scenes)
    .map<PlayerPathLinearEntry>((scene) => {
      const nodeId = opaqueNarrativeNodeId(scene.storyId, scene.sceneId);
      return {
        nodeId,
        storyId: scene.storyId,
        sceneId: scene.sceneId,
        title: scene.title ?? "已访问场景",
        summary: scene.summary,
        firstVisitedAt: scene.firstVisitedAt,
        current:
          route.current?.storyId === scene.storyId && route.current.sceneId === scene.sceneId,
        choices: scene.choices
          .filter((choice) => choice.label)
          .map((choice) => ({
            choiceId: choice.choiceId,
            label: choice.label!,
            selected: Boolean(choice.selectedAt),
          })),
      };
    })
    .filter((entry) =>
      graph.nodes.some((node) => node.id === entry.nodeId && node.state !== "hidden"),
    )
    .sort((a, b) => a.firstVisitedAt.localeCompare(b.firstVisitedAt));

  return { nodes, edges: visibleEdges, linear };
}

const skeleton = getNarrativeGraphPlayerSkeleton();
const pathScope = { packageId: skeleton.packageId, revision: skeleton.revision } as const;
const NODE_WIDTH = 184;
const NODE_HEIGHT = 72;

function layoutGraph(view: PlayerPathViewModel): {
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
            ? `当前位置：${node.label}`
            : node.state === "locked"
              ? "未揭示路线"
              : `已访问：${node.label}`,
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
        edge.state === "selected" ? `实际选择：${edge.label}` : `已见但未选择：${edge.label}`,
    })),
  };
}

interface PlayerPathPanelProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function PlayerPathPanel({ isOpen, onClose }: PlayerPathPanelProps) {
  const [viewMode, setViewMode] = useState<"graph" | "linear">("graph");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const flowInstanceRef = useRef<ReactFlowInstance<FlowNode<{ label: string }>, FlowEdge> | null>(
    null,
  );

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
    const view = buildPlayerPathViewModel(projected, routeResult.memory);
    return { status: "ready", view, flow: layoutGraph(view) } as const;
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const selected =
    result?.status === "ready"
      ? (result.view.linear.find((entry) => entry.nodeId === selectedNodeId) ??
        result.view.linear.find((entry) => entry.current) ??
        null)
      : null;

  return (
    <div className="player-path-backdrop" data-testid="player-path-backdrop">
      <aside
        className="player-path-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-path-title"
        data-testid="player-path-panel"
      >
        <header className="player-path-header">
          <div>
            <p className="player-path-eyebrow">你的已知旅程</p>
            <h2 id="player-path-title">我的路线</h2>
            <p>只显示你亲自见过的场景与选择。灰色岔路代表当时看见但没有选择。</p>
          </div>
          <button type="button" className="player-path-close" onClick={onClose}>
            关闭
          </button>
        </header>

        {result?.status === "incompatible" ? (
          <div className="player-path-empty" role="status" data-testid="player-path-incompatible">
            故事版本已变化，旧路线无法安全对应到当前内容。开始游玩后会记录新的路线。
          </div>
        ) : result?.status !== "ready" || result.view.linear.length === 0 ? (
          <div className="player-path-empty" role="status" data-testid="player-path-empty">
            还没有可回看的路线。进入剧情并看完一个场景后，这里会留下足迹。
          </div>
        ) : (
          <>
            <div className="player-path-tabs" role="tablist" aria-label="路线查看方式">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "graph"}
                onClick={() => setViewMode("graph")}
              >
                图形视图
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "linear"}
                onClick={() => setViewMode("linear")}
              >
                线性清单
              </button>
            </div>

            <div className="player-path-content">
              <section
                className={
                  viewMode === "graph" ? "player-path-graph" : "player-path-graph is-hidden"
                }
                role="tabpanel"
                aria-label="路线图形视图"
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
                  onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background gap={24} size={1} />
                  <Controls showInteractive={false} />
                </ReactFlow>
              </section>

              <section
                className={
                  viewMode === "linear" ? "player-path-linear" : "player-path-linear is-hidden"
                }
                role="tabpanel"
                aria-label="路线线性清单"
                hidden={viewMode !== "linear"}
                data-testid="player-path-linear"
              >
                <ol>
                  {result.view.linear.map((entry, index) => (
                    <li key={entry.nodeId} className={entry.current ? "is-current" : undefined}>
                      <button type="button" onClick={() => setSelectedNodeId(entry.nodeId)}>
                        <span className="player-path-step">{index + 1}</span>
                        <span>
                          <strong>{entry.title}</strong>
                          <small>{entry.current ? "当前位置" : "已访问"}</small>
                        </span>
                      </button>
                      {entry.choices.length > 0 ? (
                        <ul aria-label={`${entry.title} 的已见选择`}>
                          {entry.choices.map((choice, choiceIndex) => (
                            <li
                              key={`${choice.choiceId ?? "legacy"}-${choiceIndex}`}
                              className={choice.selected ? "is-selected" : "is-unselected"}
                            >
                              {choice.selected ? "实际选择" : "已见未选"} · {choice.label}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </section>

              <section
                className="player-path-detail"
                aria-live="polite"
                data-testid="player-path-detail"
              >
                <p className="player-path-detail-kicker">路线回顾</p>
                {selected ? (
                  <>
                    <h3>{selected.title}</h3>
                    {selected.summary ? (
                      <p>{selected.summary}</p>
                    ) : (
                      <p>这个场景没有保存文字回顾。</p>
                    )}
                    {selected.choices.length > 0 ? (
                      <ul>
                        {selected.choices.map((choice, index) => (
                          <li
                            key={`${choice.choiceId ?? "legacy"}-${index}`}
                            className={choice.selected ? "is-selected" : "is-unselected"}
                          >
                            <span>{choice.selected ? "你选择了" : "当时也看见"}</span>
                            <strong>{choice.label}</strong>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <p className="player-path-no-jump">路线图只用于回看，不能从这里跳转剧情。</p>
                  </>
                ) : (
                  <p>选择一个已访问节点查看当时保存的短回顾。</p>
                )}
              </section>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
