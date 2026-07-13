import dagre from "@dagrejs/dagre";
import type {
  NarrativeGraphCreator,
  NarrativeGraphCreatorEdge,
} from "@supaluv/shared/narrative-graph";

export const CREATOR_NODE_WIDTH = 244;
export const CREATOR_NODE_HEIGHT = 112;

export interface CreatorGraphAnalysis {
  readonly unreachableNodeIds: ReadonlySet<string>;
  readonly deadEndNodeIds: ReadonlySet<string>;
  readonly brokenEdgeIds: ReadonlySet<string>;
  readonly inboundByNode: ReadonlyMap<string, readonly NarrativeGraphCreatorEdge[]>;
  readonly outboundByNode: ReadonlyMap<string, readonly NarrativeGraphCreatorEdge[]>;
}

export interface CreatorGraphPath {
  readonly nodeIds: readonly string[];
  readonly edgeIds: readonly string[];
}

export interface CreatorNodePosition {
  readonly x: number;
  readonly y: number;
}

export function analyzeCreatorGraph(graph: NarrativeGraphCreator): CreatorGraphAnalysis {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const inboundByNode = new Map<string, NarrativeGraphCreatorEdge[]>();
  const outboundByNode = new Map<string, NarrativeGraphCreatorEdge[]>();
  const brokenEdgeIds = new Set<string>();

  for (const node of graph.nodes) {
    inboundByNode.set(node.id, []);
    outboundByNode.set(node.id, []);
  }

  for (const edge of graph.edges) {
    const fromExists = nodeIds.has(edge.fromNodeId);
    const toExists = nodeIds.has(edge.toNodeId);
    if (!fromExists || !toExists) {
      brokenEdgeIds.add(edge.id);
    }
    if (fromExists) {
      outboundByNode.get(edge.fromNodeId)?.push(edge);
    }
    if (toExists) {
      inboundByNode.get(edge.toNodeId)?.push(edge);
    }
  }

  const reachable = new Set<string>();
  const queue = graph.entryNodeIds.filter((id) => nodeIds.has(id));
  for (const entry of queue) {
    reachable.add(entry);
  }
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (!current) continue;
    for (const edge of outboundByNode.get(current) ?? []) {
      if (!nodeIds.has(edge.toNodeId) || reachable.has(edge.toNodeId)) continue;
      reachable.add(edge.toNodeId);
      queue.push(edge.toNodeId);
    }
  }

  const terminalIds = new Set(graph.terminalNodeIds);
  const unreachableNodeIds = new Set(
    graph.nodes.filter((node) => !reachable.has(node.id)).map((node) => node.id),
  );
  const deadEndNodeIds = new Set(
    graph.nodes
      .filter(
        (node) =>
          !terminalIds.has(node.id) &&
          (outboundByNode.get(node.id) ?? []).every((edge) => !nodeIds.has(edge.toNodeId)),
      )
      .map((node) => node.id),
  );

  return {
    unreachableNodeIds,
    deadEndNodeIds,
    brokenEdgeIds,
    inboundByNode,
    outboundByNode,
  };
}

export function findShortestPath(
  graph: NarrativeGraphCreator,
  targetNodeId: string | null,
  startNodeIds: readonly string[] = graph.entryNodeIds,
): CreatorGraphPath {
  if (!targetNodeId) {
    return { nodeIds: [], edgeIds: [] };
  }
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  if (!nodeIds.has(targetNodeId)) {
    return { nodeIds: [], edgeIds: [] };
  }
  const outgoing = new Map<string, NarrativeGraphCreatorEdge[]>();
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) continue;
    const list = outgoing.get(edge.fromNodeId) ?? [];
    list.push(edge);
    outgoing.set(edge.fromNodeId, list);
  }
  for (const list of outgoing.values()) {
    list.sort((a, b) => a.id.localeCompare(b.id));
  }

  const queue = [...startNodeIds].filter((id) => nodeIds.has(id)).sort();
  const visited = new Set(queue);
  const previous = new Map<string, { nodeId: string; edgeId: string }>();
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (!current) continue;
    if (current === targetNodeId) break;
    for (const edge of outgoing.get(current) ?? []) {
      if (visited.has(edge.toNodeId)) continue;
      visited.add(edge.toNodeId);
      previous.set(edge.toNodeId, { nodeId: current, edgeId: edge.id });
      queue.push(edge.toNodeId);
    }
  }
  if (!visited.has(targetNodeId)) {
    return { nodeIds: [], edgeIds: [] };
  }

  const nodePath = [targetNodeId];
  const edgePath: string[] = [];
  let cursor = targetNodeId;
  while (previous.has(cursor)) {
    const prior = previous.get(cursor);
    if (!prior) break;
    edgePath.push(prior.edgeId);
    nodePath.push(prior.nodeId);
    cursor = prior.nodeId;
  }
  return {
    nodeIds: nodePath.reverse(),
    edgeIds: edgePath.reverse(),
  };
}

export function layoutCreatorGraph(
  graph: NarrativeGraphCreator,
): Readonly<Record<string, CreatorNodePosition>> {
  const layout = new dagre.graphlib.Graph({ multigraph: true });
  layout.setDefaultEdgeLabel(() => ({}));
  layout.setGraph({
    rankdir: "LR",
    ranker: "network-simplex",
    nodesep: 34,
    ranksep: 96,
    marginx: 36,
    marginy: 36,
  });
  const sortedNodes = [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id));
  for (const node of sortedNodes) {
    layout.setNode(node.id, { width: CREATOR_NODE_WIDTH, height: CREATOR_NODE_HEIGHT });
  }
  const nodeIds = new Set(sortedNodes.map((node) => node.id));
  for (const edge of [...graph.edges].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) continue;
    layout.setEdge(edge.fromNodeId, edge.toNodeId, {}, edge.id);
  }
  dagre.layout(layout);

  return Object.fromEntries(
    sortedNodes.map((node) => {
      const position = layout.node(node.id) as { x: number; y: number };
      return [
        node.id,
        {
          x: Math.round((position.x - CREATOR_NODE_WIDTH / 2) * 100) / 100,
          y: Math.round((position.y - CREATOR_NODE_HEIGHT / 2) * 100) / 100,
        },
      ];
    }),
  );
}
