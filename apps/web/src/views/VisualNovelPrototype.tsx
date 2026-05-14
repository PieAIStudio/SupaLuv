import type { InkStorySnapshot } from "../story/inkStoryRunner";
import {
  getStoryDefinition,
  getStoryPresentation,
  getStoryScene,
  getStorySceneChoices,
  type StoryId,
} from "../story/storyMapAdapter";

interface VisualNovelPrototypeProps {
  readonly storyId: StoryId;
  readonly snapshot: InkStorySnapshot;
  readonly onStoryChange: (storyId: StoryId) => void;
  readonly onChoose: (index: number) => void;
  readonly onOpenMap: () => void;
  readonly onReset: () => void;
}

export function VisualNovelPrototype({
  storyId,
  snapshot,
  onStoryChange,
  onChoose,
  onOpenMap,
  onReset,
}: VisualNovelPrototypeProps) {
  const currentScene = getStoryScene(storyId, snapshot.sceneId);
  const currentChoices = getStorySceneChoices(storyId, snapshot.sceneId);
  const presentation = getStoryPresentation(storyId, snapshot.sceneId);
  const storyLabel = getStoryDefinition(storyId).label;

  return (
    <section
      className="vn-screen"
      aria-labelledby="prototype-title"
      data-background={presentation.backgroundKey}
      data-mood={presentation.mood}
      data-testid="vn-stage"
    >
      <div className="vn-stage-backdrop" />
      <header className="vn-hud">
        <div className="hud-left">
          <span className="prototype-badge" data-testid="prototype-badge">
            Prototype / noncanonical
          </span>
        </div>
        <div className="hud-right">
          <label className="hud-select-wrap">
            <span className="hud-select-label" data-testid="story-label">
              {storyLabel}
            </span>
            <select
              aria-label="Story selector"
              className="hud-select"
              value={storyId}
              onChange={(event) => onStoryChange(event.target.value as StoryId)}
            >
              <option value="prototype-act1">Prototype Act 1</option>
              <option value="chapter-01-trial">Chapter 01 Trial / 退款期已过</option>
            </select>
          </label>
          <button type="button" className="hud-button" onClick={onOpenMap}>
            Creator Map
          </button>
          <button type="button" className="hud-button secondary" onClick={onReset}>
            Reset
          </button>
        </div>
      </header>

      <div className="vn-stage-actors" aria-hidden="true">
        <div className="standee-glow" />
        <div className="standee-card">
          <div className="standee-silhouette" />
          <div className="standee-caption">
            <span>{presentation.speaker}</span>
            <span>{currentScene?.visualPlaceholder ?? "Prototype standee"}</span>
          </div>
        </div>
      </div>

      <article
        className="dialogue-box"
        aria-labelledby="prototype-title"
        data-testid="dialogue-box"
      >
        <div className="dialogue-meta">
          <p className="scene-chip">{currentScene?.title ?? "Unknown scene"}</p>
          <p className="mood-chip">{presentation.mood}</p>
        </div>

        <div className="nameplate-row">
          <h1 id="prototype-title" className="nameplate">
            {presentation.speaker}
          </h1>
          <p className="dialogue-subtitle">
            {currentScene?.purpose ?? "Prototype presentation pass"}
          </p>
        </div>

        <div className="story-copy">
          {snapshot.text.split("\n\n").map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <div className="choice-stack" aria-label="Current choices">
          {snapshot.choices.map((choice, index) => {
            const target = currentChoices[index]?.to;

            return (
              <button
                key={`${snapshot.sceneId ?? "unknown"}-${choice.index}-${choice.text}`}
                type="button"
                className="choice-button"
                onClick={() => onChoose(choice.index)}
              >
                <span className="choice-label">{choice.text}</span>
                <span className="choice-target">{target ? `→ ${target}` : "→ continue"}</span>
              </button>
            );
          })}
        </div>

        {snapshot.isEnded ? <p className="ending-note">原型在这个非正式支付节点暂停。</p> : null}
      </article>
    </section>
  );
}
