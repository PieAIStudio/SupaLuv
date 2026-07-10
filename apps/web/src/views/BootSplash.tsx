import { useCallback, useEffect } from "react";
import { gameAudio } from "../audio/gameAudio";
import { useLocale } from "../i18n";

interface BootSplashProps {
  readonly onEnter: () => void;
}

/**
 * First surface: click-to-unlock audio (browser autoplay policy).
 * Not a full publisher logo reel — one cinematic still + prompt.
 */
export function BootSplash({ onEnter }: BootSplashProps) {
  const { t } = useLocale();
  const enter = useCallback(() => {
    gameAudio.unlock();
    gameAudio.stopAmbient();
    gameAudio.playExclusiveBed("title-theme");
    onEnter();
  }, [onEnter]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        enter();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enter]);

  return (
    <div
      className="boot-splash"
      data-testid="boot-splash"
      role="button"
      tabIndex={0}
      onClick={enter}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          enter();
        }
      }}
    >
      <img className="boot-splash-art" src="/assets/ui/boot-splash.jpg" alt="" draggable={false} />
      <div className="boot-splash-scrim" aria-hidden="true" />
      <div className="boot-splash-copy">
        <p className="boot-splash-eyebrow">{t("boot.eyebrow")}</p>
        <h1 className="boot-splash-title">{t("boot.title")}</h1>
        <p className="boot-splash-tag">{t("boot.tag")}</p>
        <p className="boot-splash-cta" data-testid="boot-splash-cta">
          {t("boot.cta")}
        </p>
        <p className="boot-splash-hint">{t("boot.hint")}</p>
      </div>
    </div>
  );
}
