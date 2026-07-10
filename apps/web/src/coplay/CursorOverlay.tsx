import type { InterpolatedCursor } from "./cursorPresence";

interface CursorOverlayProps {
  readonly cursors: readonly InterpolatedCursor[];
  readonly localLabel?: string;
}

const COLORS = ["#e8a06a", "#7ec8ff", "#c4a0ff", "#8fd9a8"];

export function CursorOverlay({ cursors, localLabel }: CursorOverlayProps) {
  if (cursors.length === 0 && !localLabel) {
    return null;
  }
  return (
    <div className="coplay-cursor-layer" aria-hidden="true" data-testid="coplay-cursors">
      {cursors.map((cursor, index) => {
        const color = COLORS[index % COLORS.length]!;
        return (
          <div
            key={cursor.playerId}
            className="coplay-cursor"
            style={{
              left: `${cursor.xNorm * 100}%`,
              top: `${cursor.yNorm * 100}%`,
              ["--coplay-cursor-color" as string]: color,
            }}
          >
            <span className="coplay-cursor-dot" />
            <span className="coplay-cursor-label">
              {cursor.alias}
              {cursor.isHost ? " · 房主" : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
