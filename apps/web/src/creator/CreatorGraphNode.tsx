import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export interface CreatorGraphNodeData extends Record<string, unknown> {
  readonly title: string;
  readonly stableSceneId: string;
  readonly chapterLabel: string;
  readonly kind: string;
  readonly isCurrent: boolean;
  readonly isSelected: boolean;
  readonly isOnPath: boolean;
  readonly isUnreachable: boolean;
  readonly isDeadEnd: boolean;
  readonly onPreview?: (sceneId: string) => void;
}

export type CreatorFlowNode = Node<CreatorGraphNodeData, "creator">;

export function CreatorGraphNode({ data }: NodeProps<CreatorFlowNode>) {
  const classNames = [
    "creator-graph-node",
    data.isCurrent ? "is-current" : "",
    data.isSelected ? "is-selected" : "",
    data.isOnPath ? "is-on-path" : "",
    data.isUnreachable ? "has-unreachable" : "",
    data.isDeadEnd ? "has-dead-end" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classNames} data-node-id={data.stableSceneId}>
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <div className="creator-node-meta">
        <span>{data.chapterLabel}</span>
        <span>{data.kind}</span>
      </div>
      <strong>{data.title}</strong>
      <code>{data.stableSceneId}</code>
      {data.isUnreachable || data.isDeadEnd ? (
        <div className="creator-node-alerts" aria-label="节点问题">
          {data.isUnreachable ? <span>不可达</span> : null}
          {data.isDeadEnd ? <span>断路</span> : null}
        </div>
      ) : null}
      {data.onPreview ? (
        <button
          type="button"
          className="creator-node-preview"
          data-testid={`creator-node-preview-${data.stableSceneId}`}
          onClick={(event) => {
            event.stopPropagation();
            data.onPreview?.(data.stableSceneId);
          }}
        >
          从此场景预览
        </button>
      ) : null}
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </article>
  );
}
