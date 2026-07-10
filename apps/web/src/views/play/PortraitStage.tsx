import type { StagePortrait } from "../../story/storyMapAdapter";

interface PortraitStageProps {
  readonly portraits: readonly StagePortrait[];
  readonly hasArt: boolean;
  readonly mood: string;
}

export function PortraitStage({ portraits, hasArt, mood }: PortraitStageProps) {
  return (
    <div
      className={`vn-stage-actors${hasArt ? " has-art" : ""}${portraits.length > 0 ? " has-portrait" : ""}`}
      aria-hidden="true"
      data-testid="portrait-stage"
    >
      {portraits.length > 0 ? (
        <div className="portrait-row">
          {(["left", "right"] as const).map((side) => {
            const slot = portraits.find((portrait) => portrait.side === side);
            if (!slot) {
              return <div key={side} className={`portrait-slot side-${side} empty`} />;
            }
            return (
              <div
                key={`${side}-${slot.name}-${slot.url}`}
                className={`portrait-slot side-${side}${slot.active ? " is-active" : " is-dim"}`}
              >
                <img className="portrait-image" src={slot.url} alt="" draggable={false} />
                <span className="portrait-name">{slot.name}</span>
              </div>
            );
          })}
        </div>
      ) : !hasArt ? (
        <div className="standee-card">
          <div className="standee-glow" />
          <div className="standee-silhouette" data-mood={mood} />
        </div>
      ) : null}
    </div>
  );
}
