/**
 * Framework-neutral NarrativeGraph contracts.
 *
 * Ink is the topology SSOT. These types describe derived graphs for Creator Studio
 * and Player Path UI — never hand-authored topology.
 */

export const NARRATIVE_GRAPH_SCHEMA_VERSION = 1 as const;

export type NarrativeGraphSchemaVersion = typeof NARRATIVE_GRAPH_SCHEMA_VERSION;

/**
 * Domain salt for player-safe opaque handles.
 * Changing this intentionally invalidates all player graph ids (rev the schema).
 */
export const NARRATIVE_OPAQUE_HANDLE_DOMAIN = "supaluv.narrative-graph.v1" as const;

/** Structural edge kinds derived from Ink choice siblings or catalog checkpoints. */
export type NarrativeEdgeKind = "choice" | "continue" | "chapter_transition";

/** Scene-level node roles in a chapter or package graph. */
export type NarrativeNodeKind = "scene" | "entry" | "terminal";

/**
 * Stable creator scene node identity: `${storyId}#scene:${stableSceneId}`.
 * Mirrors Ink `# scene:<stableSceneId>` under a catalog story id.
 * Creator/dev only — never ship as a player artifact id.
 */
export function narrativeSceneNodeId(storyId: string, stableSceneId: string): string {
  return `${storyId}#scene:${stableSceneId}`;
}

/**
 * Stable creator choice edge identity: `${storyId}#choice:${stableChoiceId}`.
 * Mirrors Ink `# choice:<stableChoiceId>`.
 * Creator/dev only — never ship as a player artifact id.
 */
export function narrativeChoiceEdgeId(storyId: string, stableChoiceId: string): string {
  return `${storyId}#choice:${stableChoiceId}`;
}

/** Deterministic package-level chapter transition edge id (creator semantic form). */
export function narrativeChapterTransitionEdgeId(
  packageId: string,
  fromStoryId: string,
  toStoryId: string,
): string {
  return `${packageId}#chapter_transition:${fromStoryId}->${toStoryId}`;
}

export function parseNarrativeSceneNodeId(
  nodeId: string,
): { storyId: string; stableSceneId: string } | null {
  const match = /^([^#]+)#scene:(.+)$/.exec(nodeId);
  if (!match?.[1] || !match[2]) {
    return null;
  }
  return { storyId: match[1], stableSceneId: match[2] };
}

export function parseNarrativeChoiceEdgeId(
  edgeId: string,
): { storyId: string; stableChoiceId: string } | null {
  const match = /^([^#]+)#choice:(.+)$/.exec(edgeId);
  if (!match?.[1] || !match[2]) {
    return null;
  }
  return { storyId: match[1], stableChoiceId: match[2] };
}

/**
 * FNV-1a 32-bit (public domain algorithm). Used only as a building block for a
 * fixed-width deterministic digest — data minimization, not cryptographic DRM.
 */
function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function toHex8(value: number): string {
  return value.toString(16).padStart(8, "0");
}

/**
 * Deterministic 128-bit hex digest of `material` under four domain-separated
 * FNV-1a passes. Stable across browsers and Node; not sequential; not base64 of
 * the input (not reversible to semantic ids by simple decode).
 */
export function narrativeOpaqueDigest(material: string): string {
  const a = fnv1a32(`${NARRATIVE_OPAQUE_HANDLE_DOMAIN}|0|${material}`);
  const b = fnv1a32(`${NARRATIVE_OPAQUE_HANDLE_DOMAIN}|1|${material}`);
  const c = fnv1a32(`${NARRATIVE_OPAQUE_HANDLE_DOMAIN}|2|${material}`);
  const d = fnv1a32(`${NARRATIVE_OPAQUE_HANDLE_DOMAIN}|3|${material}`);
  return `${toHex8(a)}${toHex8(b)}${toHex8(c)}${toHex8(d)}`;
}

/**
 * Opaque player node handle derived from storyId + stable scene id.
 * Format: `n_` + 32 hex chars. Independent of node insertion order.
 */
export function opaqueNarrativeNodeId(storyId: string, stableSceneId: string): string {
  return `n_${narrativeOpaqueDigest(`node:${narrativeSceneNodeId(storyId, stableSceneId)}`)}`;
}

/**
 * Opaque player edge handle derived from storyId + stable choice id.
 * Format: `e_` + 32 hex chars.
 */
export function opaqueNarrativeChoiceEdgeId(storyId: string, stableChoiceId: string): string {
  return `e_${narrativeOpaqueDigest(`edge:${narrativeChoiceEdgeId(storyId, stableChoiceId)}`)}`;
}

/** Opaque player edge handle for a catalog chapter transition. */
export function opaqueNarrativeChapterTransitionEdgeId(
  packageId: string,
  fromStoryId: string,
  toStoryId: string,
): string {
  const semantic = narrativeChapterTransitionEdgeId(packageId, fromStoryId, toStoryId);
  return `e_${narrativeOpaqueDigest(`edge:${semantic}`)}`;
}

/** True when `id` looks like a generated opaque node handle. */
export function isOpaqueNarrativeNodeId(id: string): boolean {
  return /^n_[0-9a-f]{32}$/.test(id);
}

/** True when `id` looks like a generated opaque edge handle. */
export function isOpaqueNarrativeEdgeId(id: string): boolean {
  return /^e_[0-9a-f]{32}$/.test(id);
}

/**
 * Map a runtime observation node id (semantic creator form or already-opaque)
 * to the player-safe opaque handle. Returns null when the string is neither form.
 */
export function toOpaqueNarrativeNodeId(observedNodeId: string): string | null {
  if (isOpaqueNarrativeNodeId(observedNodeId)) {
    return observedNodeId;
  }
  const parsed = parseNarrativeSceneNodeId(observedNodeId);
  if (!parsed) {
    return null;
  }
  return opaqueNarrativeNodeId(parsed.storyId, parsed.stableSceneId);
}

/**
 * Map a runtime observation choice/edge id to the player-safe opaque edge handle.
 *
 * Accepts:
 * - already-opaque edge handle
 * - full semantic creator edge id (`storyId#choice:…`)
 * - bare stable choice id when `storyId` is provided
 * - bare stable choice id alone when `storyIdCandidates` is provided (tries each)
 */
export function toOpaqueNarrativeEdgeId(
  observedChoiceOrEdgeId: string,
  options?: {
    readonly storyId?: string | null;
    readonly storyIdCandidates?: readonly string[];
  },
): string | null {
  if (isOpaqueNarrativeEdgeId(observedChoiceOrEdgeId)) {
    return observedChoiceOrEdgeId;
  }
  const parsed = parseNarrativeChoiceEdgeId(observedChoiceOrEdgeId);
  if (parsed) {
    return opaqueNarrativeChoiceEdgeId(parsed.storyId, parsed.stableChoiceId);
  }
  if (options?.storyId) {
    return opaqueNarrativeChoiceEdgeId(options.storyId, observedChoiceOrEdgeId);
  }
  if (options?.storyIdCandidates?.length) {
    // Caller will validate against the skeleton; return first candidate hash only
    // when a single story is known — multi-candidate resolution is done in projectPlayerPath.
    if (options.storyIdCandidates.length === 1) {
      return opaqueNarrativeChoiceEdgeId(options.storyIdCandidates[0]!, observedChoiceOrEdgeId);
    }
  }
  return null;
}

/** 1-based inclusive line range into an authored Ink file. */
export interface NarrativeSourceRange {
  readonly file: string;
  readonly startLine: number;
  readonly endLine: number;
}

/** Production-safe player node: structure only, no prose or paths. */
export interface NarrativeGraphPlayerNode {
  /** Opaque handle (`n_` + hex). Never a semantic scene id. */
  readonly id: string;
  readonly storyId: string;
  readonly chapterId: string;
  readonly chapterOrder: number;
  readonly kind: NarrativeNodeKind;
}

/** Production-safe player edge: structure only. */
export interface NarrativeGraphPlayerEdge {
  /** Opaque handle (`e_` + hex). Never a semantic choice id. */
  readonly id: string;
  readonly kind: NarrativeEdgeKind;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  /**
   * True when the Ink choice diverts to END (chapter terminal exit).
   * Terminal self-exits keep a valid endpoint but are excluded from reachability.
   */
  readonly endsChapter?: boolean;
}

/**
 * Production-safe package skeleton.
 * Must never contain authored prose, titles, source paths, choice labels,
 * stable scene/choice id fields, hidden variable names, or condition text.
 */
export interface NarrativeGraphPlayerSkeleton {
  readonly schemaVersion: NarrativeGraphSchemaVersion;
  readonly packageId: string;
  readonly revision: string;
  readonly nodes: readonly NarrativeGraphPlayerNode[];
  readonly edges: readonly NarrativeGraphPlayerEdge[];
  readonly entryNodeIds: readonly string[];
  readonly terminalNodeIds: readonly string[];
}

/** Creator-only dialogue detail attached to a scene (not top-level graph nodes). */
export interface NarrativeGraphDialogueLine {
  readonly text: string;
  readonly sourceRange: NarrativeSourceRange | null;
}

/** Full creator node — Node/dev only; must not enter the production web graph. */
export interface NarrativeGraphCreatorNode {
  /** Semantic stable id (`storyId#scene:…`). */
  readonly id: string;
  readonly storyId: string;
  readonly chapterId: string;
  readonly chapterOrder: number;
  readonly kind: NarrativeNodeKind;
  readonly stableSceneId: string;
  readonly title: string;
  readonly excerpt: string | null;
  readonly sourceRange: NarrativeSourceRange;
  readonly dialogueLines: readonly NarrativeGraphDialogueLine[];
}

/** Full creator edge — includes labels, stable choice ids, and optional source ranges. */
export interface NarrativeGraphCreatorEdge {
  /** Semantic stable id (`storyId#choice:…` or chapter transition form). */
  readonly id: string;
  readonly kind: NarrativeEdgeKind;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  /**
   * Present for Ink-authored choice/continue edges.
   * Null for synthetic `chapter_transition` edges.
   */
  readonly stableChoiceId: string | null;
  /** True when the Ink choice diverts to END (chapter terminal exit). */
  readonly endsChapter?: boolean;
  readonly label: string | null;
  readonly sourceRange: NarrativeSourceRange | null;
}

/**
 * Full creator package graph.
 * Reach only through Node/dev loaders — never static-import from production web entrypoints.
 */
export interface NarrativeGraphCreator {
  readonly schemaVersion: NarrativeGraphSchemaVersion;
  readonly packageId: string;
  readonly revision: string;
  readonly nodes: readonly NarrativeGraphCreatorNode[];
  readonly edges: readonly NarrativeGraphCreatorEdge[];
  readonly entryNodeIds: readonly string[];
  readonly terminalNodeIds: readonly string[];
}

/**
 * Runtime-observed facts for player projection (spoiler-safe).
 *
 * Observation inputs may use existing runtime semantic ids
 * (`storyId#scene:…`, bare `# choice:` stable ids, or full semantic edge ids).
 * Output ids always match the opaque player skeleton.
 */
export interface PlayerGraphObservation {
  /**
   * Visited node ids: opaque handles and/or semantic creator node ids
   * (`storyId#scene:stableSceneId`). Unknown ids are soft-ignored.
   */
  readonly visitedNodeIds: readonly string[];
  readonly currentNodeId?: string | null;
  /**
   * Choice edges the player has seen at a choice boundary (labels optional).
   * `choiceId` may be a bare stable choice id, semantic edge id, or opaque edge id.
   * When only a bare stable choice id is supplied, the package story ids are tried.
   */
  readonly observedChoices?: readonly {
    readonly choiceId: string;
    readonly storyId?: string | null;
    readonly label?: string | null;
  }[];
  /**
   * Selected choices: bare stable choice id, semantic edge id, or opaque edge id.
   * Prefer `{ choiceId, storyId }` objects when disambiguation is needed.
   */
  readonly selectedChoiceIds?: readonly (string | { choiceId: string; storyId?: string | null })[];
  /**
   * Optional already-revealed scene titles keyed by node id
   * (opaque and/or semantic creator node id).
   */
  readonly seenSceneLabels?: Readonly<Record<string, string>>;
  /**
   * Optional already-revealed excerpts keyed by node id
   * (opaque and/or semantic creator node id).
   */
  readonly seenSceneExcerpts?: Readonly<Record<string, string>>;
}

export type ProjectedPlayerNodeState = "hidden" | "visited" | "current";

/**
 * Edge reveal states for Player Path.
 * `available_unselected` = seen at a boundary but not chosen (gray).
 * `selected` = player took this edge.
 * `hidden` = not yet observed (null placeholders at data layer).
 */
export type ProjectedPlayerEdgeState = "hidden" | "available_unselected" | "selected";

export interface ProjectedPlayerNode {
  readonly id: string;
  readonly storyId: string;
  readonly chapterId: string;
  readonly chapterOrder: number;
  readonly kind: NarrativeNodeKind;
  readonly state: ProjectedPlayerNodeState;
  /** Null while hidden — never CSS-only spoiler hiding. */
  readonly label: string | null;
  readonly excerpt: string | null;
}

export interface ProjectedPlayerEdge {
  readonly id: string;
  readonly kind: NarrativeEdgeKind;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly state: ProjectedPlayerEdgeState;
  /** Null while hidden. */
  readonly label: string | null;
  /** Terminal self-exit marker mirrored from the skeleton when present. */
  readonly endsChapter?: boolean;
}

export interface ProjectedPlayerGraph {
  readonly schemaVersion: NarrativeGraphSchemaVersion;
  readonly packageId: string;
  readonly revision: string;
  readonly nodes: readonly ProjectedPlayerNode[];
  readonly edges: readonly ProjectedPlayerEdge[];
  readonly entryNodeIds: readonly string[];
  readonly terminalNodeIds: readonly string[];
}

function creatorEdgeToOpaqueId(edge: NarrativeGraphCreatorEdge, packageId: string): string {
  if (edge.kind === "chapter_transition") {
    const from = parseNarrativeSceneNodeId(edge.fromNodeId);
    const to = parseNarrativeSceneNodeId(edge.toNodeId);
    if (!from || !to) {
      throw new Error(`NarrativeGraph: invalid chapter_transition endpoints on ${edge.id}`);
    }
    return opaqueNarrativeChapterTransitionEdgeId(packageId, from.storyId, to.storyId);
  }
  if (!edge.stableChoiceId) {
    throw new Error(`NarrativeGraph: missing stableChoiceId on edge ${edge.id}`);
  }
  const from = parseNarrativeSceneNodeId(edge.fromNodeId);
  if (!from) {
    throw new Error(`NarrativeGraph: invalid fromNodeId on edge ${edge.id}`);
  }
  return opaqueNarrativeChoiceEdgeId(from.storyId, edge.stableChoiceId);
}

function creatorNodeToOpaqueId(node: NarrativeGraphCreatorNode): string {
  return opaqueNarrativeNodeId(node.storyId, node.stableSceneId);
}

/** Strip creator fields into the production-safe opaque skeleton. */
export function toPlayerSkeleton(creator: NarrativeGraphCreator): NarrativeGraphPlayerSkeleton {
  const nodeIdMap = new Map<string, string>();
  for (const node of creator.nodes) {
    nodeIdMap.set(node.id, creatorNodeToOpaqueId(node));
  }

  const mapNodeRef = (semanticId: string): string => {
    const opaque = nodeIdMap.get(semanticId);
    if (!opaque) {
      throw new Error(`NarrativeGraph: missing node mapping for ${semanticId}`);
    }
    return opaque;
  };

  return {
    schemaVersion: creator.schemaVersion,
    packageId: creator.packageId,
    revision: creator.revision,
    nodes: creator.nodes.map((node) => ({
      id: mapNodeRef(node.id),
      storyId: node.storyId,
      chapterId: node.chapterId,
      chapterOrder: node.chapterOrder,
      kind: node.kind,
    })),
    edges: creator.edges.map((edge) => ({
      id: creatorEdgeToOpaqueId(edge, creator.packageId),
      kind: edge.kind,
      fromNodeId: mapNodeRef(edge.fromNodeId),
      toNodeId: mapNodeRef(edge.toNodeId),
      ...(edge.endsChapter ? { endsChapter: true as const } : {}),
    })),
    entryNodeIds: creator.entryNodeIds.map(mapNodeRef),
    terminalNodeIds: creator.terminalNodeIds.map(mapNodeRef),
  };
}

function indexById<T extends { id: string }>(items: readonly T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function normalizeObservedNodeId(
  observed: string,
  nodeById: Map<string, NarrativeGraphPlayerNode>,
): string | null {
  if (nodeById.has(observed)) {
    return observed;
  }
  const opaque = toOpaqueNarrativeNodeId(observed);
  if (opaque && nodeById.has(opaque)) {
    return opaque;
  }
  return null;
}

function resolveObservedEdgeId(
  observed: string,
  storyIdHint: string | null | undefined,
  edgeById: Map<string, NarrativeGraphPlayerEdge>,
  storyIds: readonly string[],
): string | null {
  if (edgeById.has(observed)) {
    return observed;
  }
  const parsed = parseNarrativeChoiceEdgeId(observed);
  if (parsed) {
    const opaque = opaqueNarrativeChoiceEdgeId(parsed.storyId, parsed.stableChoiceId);
    return edgeById.has(opaque) ? opaque : null;
  }
  if (isOpaqueNarrativeEdgeId(observed)) {
    return null;
  }
  const candidates = storyIdHint ? [storyIdHint] : storyIds;
  for (const storyId of candidates) {
    const opaque = opaqueNarrativeChoiceEdgeId(storyId, observed);
    if (edgeById.has(opaque)) {
      return opaque;
    }
  }
  return null;
}

function normalizeSelectedEntry(entry: string | { choiceId: string; storyId?: string | null }): {
  choiceId: string;
  storyId?: string | null;
} {
  if (typeof entry === "string") {
    return { choiceId: entry };
  }
  return entry;
}

/**
 * Pure player projection.
 *
 * Rules:
 * - Unvisited future nodes stay `hidden` with null label/excerpt.
 * - Visited nodes become `visited` (or `current` when currentNodeId matches).
 * - Labels/excerpts only come from supplied observations, never from skeleton.
 * - Observed but unselected choices → `available_unselected`.
 * - Selected choice ids → `selected`.
 * - Unknown observed node/choice ids are soft-ignored (no throw).
 * - Observation may use semantic runtime ids; output always uses opaque handles.
 */
export function projectPlayerPath(
  skeleton: NarrativeGraphPlayerSkeleton,
  observation: PlayerGraphObservation,
): ProjectedPlayerGraph {
  const nodeById = indexById(skeleton.nodes);
  const edgeById = indexById(skeleton.edges);
  const storyIds = [...new Set(skeleton.nodes.map((node) => node.storyId))];

  const visited = new Set<string>();
  for (const nodeId of observation.visitedNodeIds) {
    const resolved = normalizeObservedNodeId(nodeId, nodeById);
    if (resolved) {
      visited.add(resolved);
    }
  }

  const currentNodeId = observation.currentNodeId
    ? normalizeObservedNodeId(observation.currentNodeId, nodeById)
    : null;
  if (currentNodeId) {
    visited.add(currentNodeId);
  }

  const selectedEdgeIds = new Set<string>();
  for (const entry of observation.selectedChoiceIds ?? []) {
    const { choiceId, storyId } = normalizeSelectedEntry(entry);
    const resolved = resolveObservedEdgeId(choiceId, storyId, edgeById, storyIds);
    if (resolved) {
      selectedEdgeIds.add(resolved);
    }
  }

  const observedEdgeLabels = new Map<string, string | null>();
  for (const observed of observation.observedChoices ?? []) {
    const resolved = resolveObservedEdgeId(observed.choiceId, observed.storyId, edgeById, storyIds);
    if (resolved) {
      observedEdgeLabels.set(resolved, observed.label ?? null);
    }
  }

  // Selecting a choice also counts as observing it.
  for (const edgeId of selectedEdgeIds) {
    if (!observedEdgeLabels.has(edgeId)) {
      observedEdgeLabels.set(edgeId, null);
    }
  }

  const observedEdgeIds = new Set<string>(observedEdgeLabels.keys());

  // Chapter transitions become selected when both endpoints are visited.
  for (const edge of skeleton.edges) {
    if (edge.kind === "chapter_transition") {
      if (visited.has(edge.fromNodeId) && visited.has(edge.toNodeId)) {
        selectedEdgeIds.add(edge.id);
        observedEdgeIds.add(edge.id);
      } else if (visited.has(edge.fromNodeId)) {
        observedEdgeIds.add(edge.id);
      }
    }
  }

  const resolveLabelKey = (
    record: Readonly<Record<string, string>> | undefined,
    opaqueNodeId: string,
  ): string | null => {
    if (!record) {
      return null;
    }
    if (record[opaqueNodeId] != null) {
      return record[opaqueNodeId]!;
    }
    // Allow semantic keys in observation maps.
    for (const [key, value] of Object.entries(record)) {
      const resolved = normalizeObservedNodeId(key, nodeById);
      if (resolved === opaqueNodeId) {
        return value;
      }
    }
    return null;
  };

  const nodes: ProjectedPlayerNode[] = skeleton.nodes.map((node) => {
    const isCurrent = currentNodeId === node.id;
    const isVisited = visited.has(node.id);
    if (!isVisited && !isCurrent) {
      return {
        id: node.id,
        storyId: node.storyId,
        chapterId: node.chapterId,
        chapterOrder: node.chapterOrder,
        kind: node.kind,
        state: "hidden",
        label: null,
        excerpt: null,
      };
    }
    return {
      id: node.id,
      storyId: node.storyId,
      chapterId: node.chapterId,
      chapterOrder: node.chapterOrder,
      kind: node.kind,
      state: isCurrent ? "current" : "visited",
      label: resolveLabelKey(observation.seenSceneLabels, node.id),
      excerpt: resolveLabelKey(observation.seenSceneExcerpts, node.id),
    };
  });

  const edges: ProjectedPlayerEdge[] = skeleton.edges.map((edge) => {
    const endsChapter = edge.endsChapter ? ({ endsChapter: true as const } as const) : {};
    if (selectedEdgeIds.has(edge.id)) {
      return {
        id: edge.id,
        kind: edge.kind,
        fromNodeId: edge.fromNodeId,
        toNodeId: edge.toNodeId,
        state: "selected" as const,
        label: observedEdgeLabels.get(edge.id) ?? null,
        ...endsChapter,
      };
    }
    if (observedEdgeIds.has(edge.id)) {
      return {
        id: edge.id,
        kind: edge.kind,
        fromNodeId: edge.fromNodeId,
        toNodeId: edge.toNodeId,
        state: "available_unselected" as const,
        label: observedEdgeLabels.get(edge.id) ?? null,
        ...endsChapter,
      };
    }
    return {
      id: edge.id,
      kind: edge.kind,
      fromNodeId: edge.fromNodeId,
      toNodeId: edge.toNodeId,
      state: "hidden" as const,
      label: null,
      ...endsChapter,
    };
  });

  return {
    schemaVersion: skeleton.schemaVersion,
    packageId: skeleton.packageId,
    revision: skeleton.revision,
    nodes,
    edges,
    entryNodeIds: [...skeleton.entryNodeIds],
    terminalNodeIds: [...skeleton.terminalNodeIds],
  };
}

/**
 * Reachability over structural edges.
 * Explicitly ignores `endsChapter` self-exits so terminal markers cannot be
 * mistaken for ordinary traversable loops by later graph consumers.
 */
export function collectReachableNodeIds(
  startNodeIds: readonly string[],
  edges: readonly Pick<NarrativeGraphPlayerEdge, "fromNodeId" | "toNodeId" | "endsChapter">[],
): Set<string> {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.endsChapter && edge.fromNodeId === edge.toNodeId) {
      continue;
    }
    const list = adjacency.get(edge.fromNodeId) ?? [];
    list.push(edge.toNodeId);
    adjacency.set(edge.fromNodeId, list);
  }

  const seen = new Set<string>();
  const queue = [...startNodeIds];
  for (const id of startNodeIds) {
    seen.add(id);
  }
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of adjacency.get(current) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

/**
 * True when an edge is a terminal self-exit (endsChapter + self endpoint).
 * Downstream consumers must treat these as exits, not traversable loops.
 */
export function isTerminalSelfExitEdge(
  edge: Pick<NarrativeGraphPlayerEdge, "fromNodeId" | "toNodeId" | "endsChapter">,
): boolean {
  return Boolean(edge.endsChapter && edge.fromNodeId === edge.toNodeId);
}

/**
 * Validate structural integrity of a player or creator graph.
 * Throws with a descriptive message on failure.
 */
export function assertNarrativeGraphIntegrity(
  graph: NarrativeGraphPlayerSkeleton | NarrativeGraphCreator,
  options?: {
    readonly expectedSceneIdsByStory?: Readonly<Record<string, readonly string[]>>;
  },
): void {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  if (nodeIds.size !== graph.nodes.length) {
    throw new Error("NarrativeGraph: duplicate node ids");
  }
  const edgeIds = new Set(graph.edges.map((edge) => edge.id));
  if (edgeIds.size !== graph.edges.length) {
    throw new Error("NarrativeGraph: duplicate edge ids");
  }

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.fromNodeId)) {
      throw new Error(`NarrativeGraph: edge ${edge.id} from missing node ${edge.fromNodeId}`);
    }
    if (!nodeIds.has(edge.toNodeId)) {
      throw new Error(`NarrativeGraph: edge ${edge.id} to missing node ${edge.toNodeId}`);
    }
  }

  for (const entryId of graph.entryNodeIds) {
    if (!nodeIds.has(entryId)) {
      throw new Error(`NarrativeGraph: entry node missing: ${entryId}`);
    }
  }
  for (const terminalId of graph.terminalNodeIds) {
    if (!nodeIds.has(terminalId)) {
      throw new Error(`NarrativeGraph: terminal node missing: ${terminalId}`);
    }
  }

  if (options?.expectedSceneIdsByStory) {
    for (const [storyId, sceneIds] of Object.entries(options.expectedSceneIdsByStory)) {
      const storyNodes = graph.nodes.filter((node) => node.storyId === storyId);
      const stableIds = new Set(
        storyNodes.map((node) => {
          if ("stableSceneId" in node && typeof node.stableSceneId === "string") {
            return node.stableSceneId;
          }
          const parsed = parseNarrativeSceneNodeId(node.id);
          if (!parsed) {
            throw new Error(
              `NarrativeGraph: expectedSceneIdsByStory requires creator semantic nodes; invalid id ${node.id}`,
            );
          }
          return parsed.stableSceneId;
        }),
      );
      if (stableIds.size !== storyNodes.length) {
        throw new Error(`NarrativeGraph: duplicate stable scene ids in ${storyId}`);
      }
      for (const sceneId of sceneIds) {
        if (!stableIds.has(sceneId)) {
          throw new Error(`NarrativeGraph: missing manifest scene ${storyId}/${sceneId}`);
        }
      }
      if (stableIds.size !== sceneIds.length) {
        const extra = [...stableIds].filter((id) => !sceneIds.includes(id));
        throw new Error(
          `NarrativeGraph: extra scene nodes in ${storyId}: ${extra.join(", ") || "(count mismatch)"}`,
        );
      }
    }
  }
}
