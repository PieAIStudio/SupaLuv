import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
  type NodeMouseHandler,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type {
  NarrativeGraphCreatorNode,
  NarrativeGraphDialogueLine,
  NarrativeNodeKind,
} from "@supaluv/shared/narrative-graph";
import {
  CreatorApiError,
  fetchCreatorGraph,
  fetchCreatorSceneMeta,
  openScenePreview,
  runCreatorPipeline,
  saveCreatorSource,
  type CreatorGraphEnvelope,
  type CreatorSceneMeta,
  type PipelineLogEvent,
} from "./api";
import { CreatorGraphNode, type CreatorFlowNode } from "./CreatorGraphNode";
import { analyzeCreatorGraph, findShortestPath, layoutCreatorGraph } from "./graphModel";
import { SceneInspector } from "./SceneInspector";
import "../styles/creator-studio.css";

interface CreatorStudioProps {
  readonly storyId: string;
  readonly currentSceneId: string | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

interface SaveStatus {
  readonly tone: "idle" | "working" | "success" | "error";
  readonly message: string;
}

const nodeTypes = { creator: CreatorGraphNode };
const ALL = "all";

function chapterLabel(chapterId: string): string {
  if (chapterId === "draft-ch01") return "第一章";
  if (chapterId === "draft-ch02") return "第二章";
  if (chapterId === "draft-ch03") return "第三章";
  return chapterId;
}

function kindLabel(kind: NarrativeNodeKind): string {
  if (kind === "entry") return "入口";
  if (kind === "terminal") return "终点";
  return "场景";
}

function matches(node: NarrativeGraphCreatorNode, query: string): boolean {
  if (!query) return true;
  return [
    node.id,
    node.stableSceneId,
    node.title,
    node.excerpt ?? "",
    ...node.dialogueLines.map((line) => line.text),
  ]
    .join("\n")
    .toLocaleLowerCase()
    .includes(query.toLocaleLowerCase());
}

function explainError(error: unknown): string {
  if (!(error instanceof CreatorApiError)) {
    return error instanceof Error ? error.message : "保存失败，磁盘未改动。";
  }
  const messages: Record<string, string> = {
    HASH_CONFLICT: "文件冲突：Ink 已被其他修改覆盖。请刷新创作地图后重试。",
    GRAPH_CONFLICT: "版本冲突：剧情图 revision 已变化。请刷新后重试。",
    RANGE_DRIFT: "范围漂移：行号或当前文本已变化。请重新选择来源行。",
    TOPOLOGY_CHANGED: "保存被拒绝：候选修改改变了节点、choice 或 divert 拓扑。",
  };
  if (error.code === "COMPILE_FAILED") return `编译失败：${error.message}`;
  if (error.code === "INVALID_REPLACEMENT") return `修改越界：${error.message}`;
  return messages[error.code] ?? error.message;
}

export default function CreatorStudio({
  storyId,
  currentSceneId,
  isOpen,
  onClose,
}: CreatorStudioProps) {
  const [envelope, setEnvelope] = useState<CreatorGraphEnvelope | null>(null);
  const [sceneMeta, setSceneMeta] = useState<CreatorSceneMeta | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [chapterFilter, setChapterFilter] = useState(ALL);
  const [kindFilter, setKindFilter] = useState(ALL);
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<NarrativeGraphDialogueLine | null>(null);
  const [editorValue, setEditorValue] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ tone: "idle", message: "" });
  const [pipelineBusy, setPipelineBusy] = useState(false);
  const [pipelineLog, setPipelineLog] = useState("");
  const [pipelineOk, setPipelineOk] = useState<boolean | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const flowRef = useRef<ReactFlowInstance<CreatorFlowNode, Edge> | null>(null);
  const logEndRef = useRef<HTMLPreElement>(null);

  const currentNodeId = currentSceneId ? `${storyId}#scene:${currentSceneId}` : null;

  const loadGraph = useCallback(async () => {
    setLoadError(null);
    try {
      const [next, meta] = await Promise.all([fetchCreatorGraph(), fetchCreatorSceneMeta()]);
      setEnvelope(next);
      setSceneMeta(meta);
      setSelectedNodeId((prior) =>
        prior && next.graph.nodes.some((node) => node.id === prior)
          ? prior
          : currentNodeId && next.graph.nodes.some((node) => node.id === currentNodeId)
            ? currentNodeId
            : (next.graph.entryNodeIds[0] ?? next.graph.nodes[0]?.id ?? null),
      );
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "无法读取本地 creator graph。 ");
    }
  }, [currentNodeId]);

  useEffect(() => {
    if (isOpen && !envelope) void loadGraph();
  }, [envelope, isOpen, loadGraph]);

  const graph = envelope?.graph ?? null;
  const analysis = useMemo(() => (graph ? analyzeCreatorGraph(graph) : null), [graph]);
  const positions = useMemo(() => (graph ? layoutCreatorGraph(graph) : {}), [graph]);
  const selectedNode = useMemo(
    () => graph?.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [graph, selectedNodeId],
  );
  const selectedPath = useMemo(
    () => (graph ? findShortestPath(graph, selectedNodeId) : { nodeIds: [], edgeIds: [] }),
    [graph, selectedNodeId],
  );
  const currentPath = useMemo(
    () => (graph ? findShortestPath(graph, currentNodeId) : { nodeIds: [], edgeIds: [] }),
    [currentNodeId, graph],
  );
  const pathNodes = useMemo(
    () => new Set([...selectedPath.nodeIds, ...currentPath.nodeIds]),
    [currentPath.nodeIds, selectedPath.nodeIds],
  );
  const pathEdges = useMemo(
    () => new Set([...selectedPath.edgeIds, ...currentPath.edgeIds]),
    [currentPath.edgeIds, selectedPath.edgeIds],
  );
  const chapters = useMemo(
    () => [...new Set(graph?.nodes.map((node) => node.chapterId) ?? [])].sort(),
    [graph],
  );
  const rejoinSceneOptions = useMemo(() => sceneMeta?.sceneIds ?? [], [sceneMeta]);

  const visibleGraphNodes = useMemo(() => {
    if (!graph || !analysis) return [];
    return graph.nodes.filter((node) => {
      if (chapterFilter !== ALL && node.chapterId !== chapterFilter) return false;
      if (kindFilter !== ALL && node.kind !== kindFilter) return false;
      if (!matches(node, query.trim())) return false;
      if (
        issuesOnly &&
        !analysis.unreachableNodeIds.has(node.id) &&
        !analysis.deadEndNodeIds.has(node.id)
      ) {
        return false;
      }
      return true;
    });
  }, [analysis, chapterFilter, graph, issuesOnly, kindFilter, query]);
  const visibleIds = useMemo(
    () => new Set(visibleGraphNodes.map((node) => node.id)),
    [visibleGraphNodes],
  );

  const previewScene = useCallback((sceneId: string) => {
    openScenePreview(sceneId);
  }, []);

  const nodes = useMemo<CreatorFlowNode[]>(() => {
    if (!analysis) return [];
    return visibleGraphNodes.map((node) => ({
      id: node.id,
      type: "creator",
      position: positions[node.id] ?? { x: 0, y: 0 },
      draggable: false,
      connectable: false,
      data: {
        title: node.title,
        stableSceneId: node.stableSceneId,
        chapterLabel: chapterLabel(node.chapterId),
        kind: kindLabel(node.kind),
        isCurrent: node.id === currentNodeId,
        isSelected: node.id === selectedNodeId,
        isOnPath: pathNodes.has(node.id),
        isUnreachable: analysis.unreachableNodeIds.has(node.id),
        isDeadEnd: analysis.deadEndNodeIds.has(node.id),
        onPreview: previewScene,
      },
    }));
  }, [
    analysis,
    currentNodeId,
    pathNodes,
    positions,
    previewScene,
    selectedNodeId,
    visibleGraphNodes,
  ]);

  const edges = useMemo<Edge[]>(() => {
    if (!graph) return [];
    return graph.edges
      .filter((edge) => visibleIds.has(edge.fromNodeId) && visibleIds.has(edge.toNodeId))
      .map((edge) => ({
        id: edge.id,
        source: edge.fromNodeId,
        target: edge.toNodeId,
        label: edge.kind === "chapter_transition" ? "章节切换" : edge.label,
        markerEnd: { type: MarkerType.ArrowClosed },
        className: pathEdges.has(edge.id)
          ? "creator-flow-edge is-highlighted"
          : "creator-flow-edge",
        style: { strokeWidth: pathEdges.has(edge.id) ? 2.5 : 1.25 },
        labelStyle: { fontSize: 10 },
      }));
  }, [graph, pathEdges, visibleIds]);

  const selectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setSelectedLine(null);
    setEditorValue("");
    setSaveStatus({ tone: "idle", message: "" });
  }, []);
  const onNodeClick: NodeMouseHandler<CreatorFlowNode> = useCallback(
    (_event, node) => selectNode(node.id),
    [selectNode],
  );
  const openLine = useCallback((line: NarrativeGraphDialogueLine) => {
    if (!line.sourceRange) return;
    setSelectedLine(line);
    setEditorValue(line.text);
    setSaveStatus({ tone: "idle", message: "" });
  }, []);

  const canSave = Boolean(
    envelope &&
    selectedLine?.sourceRange &&
    editorValue.trim() &&
    editorValue !== selectedLine.text &&
    saveStatus.tone !== "working",
  );

  const saveLine = useCallback(async () => {
    if (!envelope || !selectedLine?.sourceRange || !canSave) return;
    const sourceHash = envelope.sources[selectedLine.sourceRange.file]?.hash;
    if (!sourceHash) {
      setSaveStatus({ tone: "error", message: "来源文件不在本地编辑白名单中。" });
      return;
    }
    setSaveStatus({ tone: "working", message: "正在编译候选并校验完整性…" });
    try {
      const next = await saveCreatorSource({
        file: selectedLine.sourceRange.file,
        revision: envelope.graph.revision,
        sourceHash,
        sourceRange: {
          startLine: selectedLine.sourceRange.startLine,
          endLine: selectedLine.sourceRange.endLine,
        },
        originalText: selectedLine.text,
        replacement: editorValue,
      });
      setEnvelope(next);
      const refreshed = next.graph.nodes
        .find((node) => node.id === selectedNodeId)
        ?.dialogueLines.find(
          (line) =>
            line.sourceRange?.file === selectedLine.sourceRange?.file &&
            line.sourceRange?.startLine === selectedLine.sourceRange?.startLine,
        );
      setSelectedLine(refreshed ?? { ...selectedLine, text: editorValue });
      setSaveStatus({ tone: "success", message: `已保存 · graph revision ${next.graph.revision}` });
    } catch (error) {
      setSaveStatus({ tone: "error", message: explainError(error) });
    }
  }, [canSave, editorValue, envelope, selectedLine, selectedNodeId]);

  const appendPipelineLog = useCallback((event: PipelineLogEvent) => {
    setPipelineLog((prev) => {
      if (event.type === "step_start") {
        return `${prev}\n▶ ${event.step}: ${event.command}\n`;
      }
      if (event.type === "stdout" || event.type === "stderr") {
        return `${prev}${event.chunk}`;
      }
      if (event.type === "step_end") {
        return `${prev}${event.ok ? "✓" : "✗"} ${event.step} (exit ${event.exitCode ?? "?"})\n`;
      }
      if (event.type === "done" || event.type === "result") {
        return `${prev}\n${event.ok ? "管线完成" : "管线失败"}\n`;
      }
      if (event.type === "error") {
        return `${prev}\n错误：${event.message}\n`;
      }
      return prev;
    });
  }, []);

  const runPipeline = useCallback(async () => {
    if (pipelineBusy) return;
    setPipelineBusy(true);
    setPipelineOk(null);
    setPipelineLog("开始一键校验：compile-ink → generate-narrative-graph → typecheck\n");
    try {
      const result = await runCreatorPipeline(appendPipelineLog);
      setPipelineOk(result.ok);
      if (result.ok) {
        await loadGraph();
      }
    } catch (error) {
      setPipelineOk(false);
      appendPipelineLog({
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setPipelineBusy(false);
    }
  }, [appendPipelineLog, loadGraph, pipelineBusy]);

  useEffect(() => {
    logEndRef.current?.scrollTo({ top: logEndRef.current.scrollHeight });
  }, [pipelineLog]);

  useEffect(() => {
    if (!isOpen) return;
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key === "/" && !target?.closest(".cm-editor, input, select, textarea")) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveLine();
      }
      if (event.key === "Escape") {
        if (selectedLine) {
          setSelectedLine(null);
          setEditorValue("");
        } else onClose();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [isOpen, onClose, saveLine, selectedLine]);

  if (!isOpen) return null;
  const inbound =
    selectedNode && analysis ? (analysis.inboundByNode.get(selectedNode.id) ?? []) : [];
  const outbound =
    selectedNode && analysis ? (analysis.outboundByNode.get(selectedNode.id) ?? []) : [];
  const issueCount = analysis
    ? analysis.unreachableNodeIds.size + analysis.deadEndNodeIds.size + analysis.brokenEdgeIds.size
    : 0;

  return (
    <aside className="creator-studio" data-testid="creator-studio" role="dialog" aria-modal="true">
      <header className="creator-studio-header">
        <div className="creator-brand-lockup">
          <span className="creator-local-stamp">LOCAL CUT</span>
          <div>
            <p>仅本地开发 · Ink 是唯一剧情拓扑真相</p>
            <h2>创作地图</h2>
          </div>
        </div>
        <div className="creator-header-metrics">
          <span>
            <strong>{graph?.nodes.length ?? 0}</strong> 节点
          </span>
          <span>
            <strong>{graph?.edges.length ?? 0}</strong> 边
          </span>
          <span className={issueCount ? "has-issues" : ""}>
            <strong>{issueCount}</strong> 异常
          </span>
          <span>
            REV <code data-testid="creator-revision">{graph?.revision ?? "loading"}</code>
          </span>
        </div>
        <div className="creator-header-actions">
          <button
            type="button"
            className={`creator-pipeline-button${pipelineOk === false ? " is-failed" : ""}${pipelineOk === true ? " is-ok" : ""}`}
            data-testid="creator-run-pipeline"
            disabled={pipelineBusy}
            onClick={() => void runPipeline()}
          >
            {pipelineBusy ? "校验中…" : "编译+图生成+校验"}
          </button>
          <button type="button" className="creator-close" onClick={onClose}>
            关闭 <kbd>Esc</kbd>
          </button>
        </div>
      </header>

      {pipelineLog ? (
        <div className="creator-pipeline-log-wrap" data-testid="creator-pipeline-log">
          <pre ref={logEndRef} className="creator-pipeline-log">
            {pipelineLog}
          </pre>
        </div>
      ) : null}

      {loadError ? (
        <section className="creator-load-failure" role="alert">
          <h3>本地图读取失败</h3>
          <p>{loadError}</p>
          <button type="button" onClick={() => void loadGraph()}>
            重试
          </button>
        </section>
      ) : !graph || !analysis ? (
        <div className="creator-loading" role="status">
          正在装载创作地图与场景 manifest…
        </div>
      ) : (
        <div className="creator-studio-grid">
          <section className="creator-browser" aria-label="剧情图浏览器">
            <div className="creator-filter-rail">
              <label className="creator-search-field">
                <span>搜索节点或正文</span>
                <input
                  ref={searchRef}
                  data-testid="creator-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ID、标题、正文…  / 聚焦"
                />
              </label>
              <label>
                <span>章节</span>
                <select value={chapterFilter} onChange={(e) => setChapterFilter(e.target.value)}>
                  <option value={ALL}>全部章节</option>
                  {chapters.map((chapter) => (
                    <option key={chapter} value={chapter}>
                      {chapterLabel(chapter)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>类型</span>
                <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
                  <option value={ALL}>全部类型</option>
                  <option value="entry">入口</option>
                  <option value="scene">场景</option>
                  <option value="terminal">终点</option>
                </select>
              </label>
              <label className="creator-check-filter">
                <input
                  type="checkbox"
                  checked={issuesOnly}
                  onChange={(e) => setIssuesOnly(e.target.checked)}
                />
                <span>只看断路</span>
              </label>
              <button
                type="button"
                className="creator-fit-button"
                onClick={() => flowRef.current?.fitView({ padding: 0.16 })}
              >
                适应全图
              </button>
            </div>

            {query ? (
              <div className="creator-search-results" aria-live="polite">
                <span>{visibleGraphNodes.length} 个匹配</span>
                {visibleGraphNodes.slice(0, 7).map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    data-node-id={node.stableSceneId}
                    onClick={() => {
                      selectNode(node.id);
                      const point = positions[node.id];
                      if (point)
                        flowRef.current?.setCenter(point.x + 122, point.y + 56, { zoom: 1.15 });
                    }}
                  >
                    <code>{node.stableSceneId}</code>
                    <span>{node.title}</span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="creator-flow-canvas">
              <ReactFlow<CreatorFlowNode, Edge>
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodeClick={onNodeClick}
                onInit={(instance) => {
                  flowRef.current = instance;
                  const focusId = currentNodeId ?? graph.entryNodeIds[0];
                  const focus = focusId ? positions[focusId] : null;
                  window.requestAnimationFrame(() => {
                    if (focus) {
                      void instance.setCenter(focus.x + 122, focus.y + 56, {
                        zoom: 0.72,
                        duration: 0,
                      });
                    } else {
                      void instance.fitView({ padding: 0.16, duration: 0 });
                    }
                  });
                }}
                nodesDraggable={false}
                nodesConnectable={false}
                zoomOnDoubleClick={false}
                onlyRenderVisibleElements
                minZoom={0.12}
                maxZoom={1.8}
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={24} size={1} />
                <MiniMap
                  pannable
                  zoomable
                  nodeStrokeWidth={2}
                  nodeColor={(node) => {
                    const item = node as CreatorFlowNode;
                    return item.data.isCurrent
                      ? "#d8a86a"
                      : item.data.isUnreachable
                        ? "#8d3f54"
                        : "#47424b";
                  }}
                />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
          </section>

          <section className="creator-inspector" aria-label="节点详情">
            {selectedNode ? (
              <>
                <SceneInspector
                  sceneId={selectedNode.stableSceneId}
                  chapterId={selectedNode.chapterId}
                  chapterLabel={chapterLabel(selectedNode.chapterId)}
                  kindLabel={kindLabel(selectedNode.kind)}
                  title={selectedNode.title}
                  meta={sceneMeta}
                  onMetaChange={setSceneMeta}
                  rejoinSceneOptions={rejoinSceneOptions}
                />
                <dl className="creator-node-facts">
                  <div>
                    <dt>稳定 ID</dt>
                    <dd>{selectedNode.id}</dd>
                  </div>
                  <div>
                    <dt>入 / 出边</dt>
                    <dd>
                      {inbound.length} / {outbound.length}
                    </dd>
                  </div>
                  <div>
                    <dt>来源</dt>
                    <dd>
                      {selectedNode.sourceRange.file}:{selectedNode.sourceRange.startLine}–
                      {selectedNode.sourceRange.endLine}
                    </dd>
                  </div>
                  <div>
                    <dt>路径</dt>
                    <dd>
                      {selectedPath.nodeIds.length
                        ? `${selectedPath.nodeIds.length} 节点`
                        : "入口不可达"}
                    </dd>
                  </div>
                </dl>
                <section className="creator-detail-section">
                  <div className="creator-section-title">
                    <h4>当前文本</h4>
                    <span>点击一行进入安全编辑</span>
                  </div>
                  <div className="creator-dialogue-lines">
                    {selectedNode.dialogueLines.length ? (
                      selectedNode.dialogueLines.map((line, index) => (
                        <button
                          key={`${line.sourceRange?.startLine ?? index}-${line.text}`}
                          type="button"
                          disabled={!line.sourceRange}
                          data-source-line-start={line.sourceRange?.startLine}
                          className={
                            selectedLine?.sourceRange?.startLine === line.sourceRange?.startLine
                              ? "is-active"
                              : ""
                          }
                          onClick={() => openLine(line)}
                        >
                          <span>{line.sourceRange ? `L${line.sourceRange.startLine}` : "—"}</span>
                          <p>{line.text}</p>
                        </button>
                      ))
                    ) : (
                      <p className="creator-empty-copy">此节点没有可编辑正文行。</p>
                    )}
                  </div>
                </section>
                <section className="creator-detail-section">
                  <div className="creator-section-title">
                    <h4>选项与去向</h4>
                    <span>{outbound.length} 条</span>
                  </div>
                  <div className="creator-option-list">
                    {outbound.length ? (
                      outbound.map((edge) => (
                        <button
                          key={edge.id}
                          type="button"
                          onClick={() => selectNode(edge.toNodeId)}
                        >
                          <span>
                            {edge.kind === "chapter_transition" ? "章节" : edge.stableChoiceId}
                          </span>
                          <strong>{edge.label ?? "进入下一章"}</strong>
                          <code>→ {edge.toNodeId.split("#scene:")[1] ?? edge.toNodeId}</code>
                        </button>
                      ))
                    ) : (
                      <p className="creator-empty-copy">没有出边；只有终点节点允许如此。</p>
                    )}
                  </div>
                </section>
                {selectedLine?.sourceRange ? (
                  <section className="creator-editor-panel">
                    <div className="creator-editor-heading">
                      <div>
                        <span>安全 source range</span>
                        <h4>{selectedLine.sourceRange.file}</h4>
                      </div>
                      <code>L{selectedLine.sourceRange.startLine}</code>
                    </div>
                    <p>只允许修改现有文字与标点；不能增删行、节点、choice、divert 或 target。</p>
                    <div className="creator-source-editor">
                      <CodeMirror
                        value={editorValue}
                        minHeight="118px"
                        maxHeight="220px"
                        basicSetup={{
                          lineNumbers: false,
                          foldGutter: false,
                          highlightActiveLine: false,
                          highlightActiveLineGutter: false,
                          autocompletion: false,
                        }}
                        onChange={setEditorValue}
                        aria-label="Ink source text"
                      />
                    </div>
                    <div className="creator-save-row">
                      <p
                        data-testid="creator-save-status"
                        className={`creator-save-status is-${saveStatus.tone}`}
                        role="status"
                      >
                        {saveStatus.message || "⌘/Ctrl + S 保存"}
                      </p>
                      <button
                        type="button"
                        data-testid="creator-save"
                        disabled={!canSave}
                        onClick={() => void saveLine()}
                      >
                        {saveStatus.tone === "working" ? "校验中…" : "编译并保存"}
                      </button>
                    </div>
                  </section>
                ) : null}
              </>
            ) : (
              <div className="creator-inspector-empty">
                <h3>选择一个节点</h3>
                <p>查看完整文本、选项和 Ink 来源。</p>
              </div>
            )}
          </section>
        </div>
      )}
    </aside>
  );
}
