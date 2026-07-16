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
const AGE_GATE_KEY = "supaluv.ageGate.v1";

function ageConfirmed(): boolean {
  try {
    return localStorage.getItem(AGE_GATE_KEY) === "confirmed";
  } catch {
    return false;
  }
}

export function BootSplash({ onEnter, busy = false }: BootSplashProps) {
  const { t } = useLocale();
  const [artReady, setArtReady] = useState(false);
  const [showAgeGate, setShowAgeGate] = useState(false);
  const proceed = useCallback(() => {
    if (!onEnter) {
      return;
    }
    gameAudio.unlock();
    gameAudio.stopAmbient();
    gameAudio.playExclusiveBed("title-theme");
    onEnter();
  }, [onEnter]);
  const enter = useCallback(() => {
    if (busy || !onEnter) {
      return;
    }
    // Adult-content gate: confirm once per device before the first entry.
    if (!ageConfirmed()) {
      setShowAgeGate(true);
      return;
    }
    proceed();
  }, [busy, onEnter, proceed]);
  const confirmAge = useCallback(() => {
    try {
      localStorage.setItem(AGE_GATE_KEY, "confirmed");
    } catch {
      // Private-mode storage failure: still let this session through.
    }
    setShowAgeGate(false);
    proceed();
  }, [proceed]);

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
      {showAgeGate ? (
        <div
          className="age-gate-layer"
          data-testid="age-gate"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="age-gate-title"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="age-gate-card">
            <h2 id="age-gate-title">{t("ageGate.title")}</h2>
            <p className="age-gate-body">{t("ageGate.body")}</p>
            <button
              type="button"
              className="age-gate-confirm"
              data-testid="age-gate-confirm"
              onClick={confirmAge}
            >
              {t("ageGate.confirm")}
            </button>
            <p className="age-gate-minor-hint">{t("ageGate.minorHint")}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
