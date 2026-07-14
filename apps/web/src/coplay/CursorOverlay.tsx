import { useLocale } from "../i18n";
import { formatCursorLabel } from "./coplayDisplay";
import type { InterpolatedCursor } from "./cursorPresence";

interface CursorOverlayProps {
  readonly cursors: readonly InterpolatedCursor[];
  readonly localLabel?: string;
}

const COLORS = ["#e8a06a", "#7ec8ff", "#c4a0ff", "#8fd9a8"];

export function CursorOverlay({ cursors, localLabel }: CursorOverlayProps) {
  const { t } = useLocale();
  if (cursors.length === 0 && !localLabel) {
    return null;
  }
  return (
    <div
      className="coplay-cursor-layer"
      aria-label={t("coplay.cursorLayerAria")}
      data-testid="coplay-cursors"
    >
      {cursors.map((cursor, index) => {
        const color = COLORS[index % COLORS.length]!;
        const label = formatCursorLabel({
          alias: cursor.alias,
          isHost: cursor.isHost,
          hostSuffix: t("coplay.hostSuffix"),
        });
        return (
          <div
            key={cursor.playerId}
            className="coplay-cursor"
            aria-label={label}
            style={{
              left: `${cursor.xNorm * 100}%`,
              top: `${cursor.yNorm * 100}%`,
              ["--coplay-cursor-color" as string]: color,
            }}
          >
            <span className="coplay-cursor-dot" aria-hidden="true" />
            <span className="coplay-cursor-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
