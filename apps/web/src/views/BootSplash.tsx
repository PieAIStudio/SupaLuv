import { useCallback, useEffect, useState } from "react";
import { gameAudio } from "../audio/gameAudio";
import { useLocale } from "../i18n";
import { preloadDecodedImage } from "../loading/atomicLoading";

interface BootSplashProps {
  readonly onEnter?: () => void;
  readonly busy?: boolean;
}

/**
 * First surface: click-to-unlock audio (browser autoplay policy).
 * Not a full publisher logo reel — one cinematic still + prompt.
 */
export function BootSplash({ onEnter, busy = false }: BootSplashProps) {
  const { t } = useLocale();
  const [artReady, setArtReady] = useState(false);
  const enter = useCallback(() => {
    if (busy || !onEnter) {
      return;
    }
    gameAudio.unlock();
    gameAudio.stopAmbient();
    gameAudio.playExclusiveBed("title-theme");
    onEnter();
  }, [busy, onEnter]);

  useEffect(() => {
    let active = true;
    void preloadDecodedImage("/assets/ui/boot-splash.jpg")
      .then(() => {
        if (active) {
          setArtReady(true);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (busy || !onEnter) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        enter();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, enter, onEnter]);

  return (
    <div
      className="boot-splash"
      data-testid="boot-splash"
      data-art-ready={artReady ? "true" : "false"}
      data-busy={busy ? "true" : "false"}
      role={busy ? "status" : "button"}
      aria-busy={busy}
      aria-disabled={busy || undefined}
      tabIndex={busy ? -1 : 0}
      onClick={busy ? undefined : enter}
    >
      {artReady ? (
        <img
          className="boot-splash-art is-ready"
          src="/assets/ui/boot-splash.jpg"
          alt=""
          draggable={false}
        />
      ) : (
        <div className="boot-splash-art boot-splash-art-fallback" aria-hidden="true" />
      )}
      <div className="boot-splash-scrim" aria-hidden="true" />
      <div className="boot-splash-copy">
        <p className="boot-splash-eyebrow">{t("boot.eyebrow")}</p>
        <h1 className="boot-splash-title">{t("boot.title")}</h1>
        <p className="boot-splash-tag">{t("boot.tag")}</p>
        <p className="boot-splash-cta" data-testid="boot-splash-cta">
          {busy ? t("common.loading") : t("boot.cta")}
        </p>
        <p className="boot-splash-hint">{busy ? t("common.loading") : t("boot.hint")}</p>
      </div>
    </div>
  );
}
