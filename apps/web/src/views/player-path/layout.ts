import dagre from "@dagrejs/dagre";
import { MarkerType, type Edge as FlowEdge, type Node as FlowNode } from "@xyflow/react";
import type { PlayerPathCopy, PlayerPathViewModel } from "./viewModel";

const NODE_WIDTH = 184;
const NODE_HEIGHT = 72;

export function layoutGraph(
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
