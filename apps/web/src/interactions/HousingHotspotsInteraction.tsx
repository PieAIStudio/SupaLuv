import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "../i18n";
import type { InkStorySnapshot } from "../story/inkStoryRunner";
import {
  housingHotspots,
  housingHotspotsSkipChoiceIds,
  type HousingHotspotId,
} from "./housingHotspots";
import type { ActiveStoryInteraction } from "./types";
import { useInteractionChoiceCommit } from "./useInteractionChoiceCommit";

interface HousingHotspotsInteractionProps {
  readonly active: ActiveStoryInteraction;
  readonly snapshot: InkStorySnapshot;
  readonly paused: boolean;
  readonly onChoose: (index: number) => void;
}

export function HousingHotspotsInteraction({
  active,
  snapshot,
  paused,
  onChoose,
}: HousingHotspotsInteractionProps) {
  const { t } = useLocale();
  const hotspot = housingHotspots[active.stepIndex];
  const panelRef = useRef<HTMLElement | null>(null);
  const [inspectedNote, setInspectedNote] = useState<string | null>(null);
  const { busy, commitChoice } = useInteractionChoiceCommit(snapshot, paused, onChoose);

  useEffect(() => {
    setInspectedNote(null);
    if (!paused) {
      panelRef.current?.focus();
    }
  }, [paused, hotspot?.id, active.stepIndex]);

  const inspect = useCallback(
    (id: HousingHotspotId) => {
      if (!hotspot || busy || paused || id !== hotspot.id) {
        return;
      }
      setInspectedNote(t(`interaction.housing.note.${id}`));
      commitChoice(hotspot.inspectChoiceId, 640, "notify-soft");
    },
    [busy, commitChoice, hotspot, paused, t],
  );

  const skip = useCallback(() => {
    if (busy || paused) {
      return;
    }
    const skipId = housingHotspotsSkipChoiceIds[active.stepIndex];
    if (!skipId) {
      return;
    }
    setInspectedNote(t("interaction.housing.feedbackSkip"));
    commitChoice(skipId, 420, "ui-choice");
  }, [active.stepIndex, busy, commitChoice, paused, t]);

  if (!hotspot) {
    return null;
  }

  const step = active.stepIndex + 1;
  const disabled = paused || busy;

  return (
    <section
      ref={panelRef}
      className="story-interaction housing-hotspots"
      aria-labelledby="housing-hotspots-title"
      aria-describedby="housing-hotspots-instructions"
      data-testid="housing-hotspots"
      data-story-interaction-id={active.definition.id}
      data-step={step}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (disabled) {
          return;
        }
        if (event.key === "1") {
          event.preventDefault();
          inspect("wall");
        } else if (event.key === "2") {
          event.preventDefault();
          inspect("cat");
        } else if (event.key === "3") {
          event.preventDefault();
          inspect("stairwell");
        } else if (event.key.toLowerCase() === "s") {
          event.preventDefault();
          skip();
        }
      }}
    >
      <header className="story-interaction-header">
        <div>
          <p className="story-interaction-kicker">{t("interaction.housing.kicker")}</p>
          <h2 id="housing-hotspots-title">{t("interaction.housing.title")}</h2>
        </div>
        <div className="story-interaction-status">{t("interaction.housing.localOnly")}</div>
      </header>

      <div
        className="story-interaction-progress"
        aria-live="polite"
        aria-label={t("interaction.progressLabel")
          .replace("{step}", String(step))
          .replace("{total}", "3")}
      >
        <span>SPOT {String(step).padStart(2, "0")} / 03</span>
        <div className="story-interaction-progress-rail" aria-hidden="true">
          {housingHotspots.map((entry, index) => (
            <i
              key={entry.id}
              className={
                index < active.stepIndex
                  ? "is-active"
                  : index === active.stepIndex
                    ? "is-active"
                    : undefined
              }
            />
          ))}
        </div>
      </div>

      <p id="housing-hotspots-instructions" className="story-interaction-instructions">
        {t("interaction.housing.instructions")}
      </p>

      <div
        className="housing-hotspots-map"
        role="group"
        aria-label={t("interaction.housing.mapLabel")}
      >
        {housingHotspots.map((entry, index) => {
          const done = index < active.stepIndex;
          const current = index === active.stepIndex;
          return (
            <button
              key={entry.id}
              type="button"
              className={`housing-hotspot housing-hotspot-${entry.id}${done ? " is-done" : ""}${current ? " is-current" : ""}`}
              data-testid={`housing-hotspot-${entry.id}`}
              disabled={disabled || !current}
              aria-keyshortcuts={String(index + 1)}
              aria-pressed={done}
              onClick={() => inspect(entry.id)}
            >
              <span className="story-interaction-key">{index + 1}</span>
              <strong>{t(`interaction.housing.hotspot.${entry.id}`)}</strong>
              <small>
                {done
                  ? t("interaction.housing.inspected")
                  : current
                    ? t("interaction.housing.tapToInspect")
                    : t("interaction.housing.locked")}
              </small>
            </button>
          );
        })}
      </div>

      <footer className="story-interaction-footer">
        <p className="story-interaction-feedback" aria-live="polite" data-testid="housing-feedback">
          {inspectedNote ?? t("interaction.housing.feedbackIdle")}
        </p>
        <button
          type="button"
          className="story-interaction-skip"
          data-testid="housing-hotspots-skip"
          disabled={disabled}
          aria-keyshortcuts="S"
          onClick={skip}
        >
          {t("interaction.skip")} <span>S</span>
        </button>
      </footer>
    </section>
  );
}
