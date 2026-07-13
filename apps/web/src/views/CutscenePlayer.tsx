import { GameBadge, GameButton } from "@pieai/swimmer-ui-kit";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "../i18n";

interface CutscenePlayerProps {
  readonly videoKey: string;
  readonly url: string;
  readonly title: string;
  readonly onDismiss: () => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const whole = Math.floor(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Event CG / cutscene player.
 * Always starts muted so browsers allow autoplay; motion is the proof of "video".
 */
export function CutscenePlayer({ videoKey, url, title, onDismiss }: CutscenePlayerProps) {
  const { t } = useLocale();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "error">("loading");
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    let cancelled = false;

    async function start() {
      if (!video || cancelled) {
        return;
      }
      // Critical: muted + playsInline is required for reliable autoplay.
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");

      try {
        await video.play();
        if (!cancelled) {
          setStatus("playing");
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(error instanceof Error ? error.message : t("cutscene.autoplayBlocked"));
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      video.pause();
    };
  }, [t, url, videoKey]);

  const progress = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;

  return (
    <div className="cutscene-layer" data-testid="cutscene-layer" data-status={status}>
      <video
        ref={videoRef}
        key={videoKey}
        className="cutscene-video"
        src={url}
        autoPlay
        muted
        playsInline
        preload="auto"
        data-testid="cutscene-video"
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration || 0);
        }}
        onTimeUpdate={(event) => {
          setCurrent(event.currentTarget.currentTime || 0);
        }}
        onPlaying={() => setStatus("playing")}
        onError={() => {
          setStatus("error");
          setErrorMessage(t("cutscene.loadFailed"));
        }}
        onEnded={onDismiss}
      />
      <div className="cutscene-scrim" />
      <div className="cutscene-chrome">
        <GameBadge tone="ai">{t("cutscene.badge")}</GameBadge>
        <h2 className="cutscene-title">{title}</h2>
        <p className="cutscene-hint" data-testid="cutscene-status">
          {status === "loading" ? t("cutscene.loading") : null}
          {status === "playing"
            ? `${t("cutscene.playingPrefix")} ${formatTime(current)} / ${formatTime(duration || 6)} · ${t("cutscene.playingHint")}`
            : null}
          {status === "error" ? (errorMessage ?? t("cutscene.failed")) : null}
        </p>
        <div
          className="cutscene-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-label={t("cutscene.progress")}
          data-testid="cutscene-progress"
        >
          <div className="cutscene-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="cutscene-actions">
          {status === "error" ? (
            <GameButton
              type="button"
              variant="secondary"
              onClick={() => {
                const video = videoRef.current;
                if (!video) {
                  return;
                }
                setStatus("loading");
                setErrorMessage(null);
                video.muted = true;
                void video.play().then(
                  () => setStatus("playing"),
                  () => {
                    setStatus("error");
                    setErrorMessage(t("cutscene.retryFailed"));
                  },
                );
              }}
            >
              {t("cutscene.retry")}
            </GameButton>
          ) : null}
          <GameButton type="button" variant="primary" onClick={onDismiss}>
            {t("cutscene.skip")}
          </GameButton>
        </div>
      </div>
    </div>
  );
}
