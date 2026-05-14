import { getStoryMapPreview, type StoryId } from "../story/storyMapAdapter";

interface StoryMapPreviewProps {
  readonly storyId: StoryId;
  readonly currentSceneId: string | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function StoryMapPreview({
  storyId,
  currentSceneId,
  isOpen,
  onClose,
}: StoryMapPreviewProps) {
  const { map, mermaid } = getStoryMapPreview(storyId);

  return (
    <aside
      className={isOpen ? "story-map-panel is-open" : "story-map-panel"}
      aria-labelledby="story-map-title"
      aria-hidden={!isOpen}
      data-testid="story-map-panel"
      hidden={!isOpen}
    >
      <div className="panel-header">
        <div className="drawer-header-row">
          <div>
            <p className="eyebrow">Creator overview</p>
            <h2 id="story-map-title">静态故事总览图</h2>
          </div>
          <button type="button" className="hud-button secondary" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="panel-copy">
          这里先用项目内 scene metadata 生成节点、边和 Mermaid 字符串，不引入 React Flow。
        </p>
      </div>

      <div className="story-map-grid">
        <section aria-labelledby="scene-list-title">
          <h3 id="scene-list-title">Scene list</h3>
          <div className="scene-list">
            {map.nodes.map((node) => (
              <article
                key={node.id}
                className={node.id === currentSceneId ? "scene-card current" : "scene-card"}
              >
                <p className="scene-card-id">{node.id}</p>
                <h4>{node.title}</h4>
                <p>{node.purpose}</p>
                <p className="scene-card-visual">{node.visualPlaceholder}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="edge-list-title">
          <h3 id="edge-list-title">Edge list</h3>
          <ul className="edge-list">
            {map.edges.map((edge) => (
              <li key={`${edge.from}-${edge.label}-${edge.to}`}>
                <strong>{edge.kind}</strong> {edge.from} -[{edge.label}]-&gt; {edge.to}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="mermaid-title">
        <h3 id="mermaid-title">Mermaid flowchart</h3>
        <pre className="mermaid-preview">{mermaid}</pre>
      </section>
    </aside>
  );
}
