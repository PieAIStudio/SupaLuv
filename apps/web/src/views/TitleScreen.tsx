import { GameBadge, GameButton, GamePanel } from "@pieai/swimmer-ui-kit";
import { useCallback, useEffect, useState } from "react";
import { bedLabel } from "../audio/bedCatalog";
import { gameAudio } from "../audio/gameAudio";
import { useAuth } from "../auth/AuthContext";
import { useLocale } from "../i18n";
import { preferredTransportKind } from "../coplay/createCoPlayTransport";
import { makeRoomCode, normalizeRoomCode } from "../coplay/protocol";
import {
  AUTOSAVE_SLOT,
  findLatestSave,
  listSaveSlots,
  loadSave,
  MANUAL_SLOTS,
  type GameSavePayload,
  type ManualSlotId,
} from "../persistence/gameSave";

interface TitleScreenProps {
  readonly onNewGame: () => void;
  readonly onContinue: (slotId?: string) => void;
  readonly onOpenGallery: () => void;
  readonly onOpenSettings: () => void;
  readonly onOpenHelp?: () => void;
  readonly onOpenAchievements?: () => void;
  readonly onOpenAiSpend?: () => void;
  readonly onHostCoPlay?: (roomCode: string, alias: string) => void;
  readonly onJoinCoPlay?: (roomCode: string, alias: string) => void;
  readonly continueBlockedMessage?: string | null;
  readonly onDismissContinueBlocked?: () => void;
}

function formatSave(save: GameSavePayload | null, emptyLabel: string, locale: string): string {
  if (!save) {
    return emptyLabel;
  }
  const hint = save.chapterHint ? ` · ${save.chapterHint}` : "";
  return `${save.label}${hint} · ${new Date(save.savedAt).toLocaleString(locale)}`;
}

const NARROW_LANDSCAPE_QUERY = "(max-height: 520px) and (orientation: landscape)";

function shouldExpandSecondaryTitleActions(): boolean {
  return typeof window === "undefined" || !window.matchMedia(NARROW_LANDSCAPE_QUERY).matches;
}

export function TitleScreen({
  onNewGame,
  onContinue,
  onOpenGallery,
  onOpenSettings,
  onOpenHelp,
  onOpenAchievements,
  onOpenAiSpend,
  onHostCoPlay,
  onJoinCoPlay,
  continueBlockedMessage = null,
  onDismissContinueBlocked,
}: TitleScreenProps) {
  const auth = useAuth();
  const { t, locale, setLocale } = useLocale();
  const [showSlots, setShowSlots] = useState(false);
  const [showCoPlay, setShowCoPlay] = useState(false);
  const [showSecondaryActions, setShowSecondaryActions] = useState(
    shouldExpandSecondaryTitleActions,
  );
  const [joinCode, setJoinCode] = useState("");
  const [coPlayAlias, setCoPlayAlias] = useState("");
  const [nowPlaying, setNowPlaying] = useState<string | null>(() => gameAudio.getNowPlayingKey());
  const latest = findLatestSave();
  const autosave = loadSave(AUTOSAVE_SLOT);
  const manualSaves = MANUAL_SLOTS.map((id) => loadSave(id));
  const slotCount = listSaveSlots().length;

  const armAudio = useCallback(() => {
    gameAudio.unlock();
    gameAudio.playExclusiveBed("title-theme");
  }, []);

  useEffect(() => {
    gameAudio.playExclusiveBed("title-theme");
    gameAudio.preload();
  }, []);

  useEffect(() => gameAudio.onNowPlayingChange(setNowPlaying), []);

  useEffect(() => {
    const media = window.matchMedia(NARROW_LANDSCAPE_QUERY);
    const syncSecondaryActions = () => setShowSecondaryActions(!media.matches);
    syncSecondaryActions();
    media.addEventListener("change", syncSecondaryActions);
    return () => media.removeEventListener("change", syncSecondaryActions);
  }, []);

  return (
    <div className="title-screen" data-testid="title-screen">
      <div className="title-bg" aria-hidden="true" />
      <div className="title-bg-scrim" aria-hidden="true" />
      <div className="title-grain" aria-hidden="true" />

      <div className="title-layout">
        <div className="title-hero">
          <GameBadge tone="ai">{t("title.badge")}</GameBadge>
          <p className="title-eyebrow">{t("title.eyebrow")}</p>
          <h1 className="title-logo">{t("title.logo")}</h1>
          <p className="title-tagline">{t("title.tagline")}</p>
          <p className="title-sub">
            {t("title.sub")}
            {slotCount > 0 ? ` · ${slotCount}` : ""}
          </p>
          {nowPlaying ? (
            <p className="title-audio-hint is-live" data-testid="title-now-playing">
              ♪ {bedLabel(nowPlaying, locale)}
            </p>
          ) : null}
        </div>

        <GamePanel className="title-menu" tone="strong">
          <div className="title-account-row" data-testid="title-account-row">
            {auth.isSignedIn ? (
              <>
                <span className="title-account-status">
                  {auth.user?.is_anonymous ? t("title.guest") : t("title.signedIn")} ·{" "}
                  {(auth.user?.id ?? "").slice(0, 6)}…
                </span>
                <GameButton
                  type="button"
                  variant="ghost"
                  onClick={onOpenSettings}
                  data-testid="title-account-settings"
                >
                  {t("title.account")}
                </GameButton>
              </>
            ) : (
              <>
                <span className="title-account-status">{t("title.notSignedIn")}</span>
                <GameButton
                  type="button"
                  variant="secondary"
                  disabled={auth.busy || !auth.configured}
                  onClick={() => {
                    void auth.signInGuest().catch(() => onOpenSettings());
                  }}
                  data-testid="title-account-guest"
                >
                  {t("title.guestLogin")}
                </GameButton>
              </>
            )}
          </div>
          <div className="title-lang-row" data-testid="title-lang-row">
            <button
              type="button"
              className={locale === "zh-CN" ? "title-lang is-active" : "title-lang"}
              onClick={() => setLocale("zh-CN")}
            >
              中文
            </button>
            <button
              type="button"
              className={locale === "en" ? "title-lang is-active" : "title-lang"}
              onClick={() => setLocale("en")}
            >
              EN
            </button>
          </div>
          <div className="title-actions">
            {continueBlockedMessage ? (
              <div
                className="title-save-blocked"
                data-testid="title-save-incompatible"
                role="alert"
              >
                <p>{continueBlockedMessage}</p>
                {onDismissContinueBlocked ? (
                  <GameButton type="button" variant="ghost" onClick={onDismissContinueBlocked}>
                    {t("title.dismiss")}
                  </GameButton>
                ) : null}
              </div>
            ) : null}
            <div className="title-primary-actions" aria-label={t("title.primaryActions")}>
              <GameButton
                type="button"
                variant="primary"
                onClick={() => {
                  armAudio();
                  if (latest) {
                    const ok = window.confirm(t("title.newGameConfirm"));
                    if (!ok) {
                      return;
                    }
                  }
                  onNewGame();
                }}
                data-testid="title-new-game"
              >
                {t("title.newGame")}
              </GameButton>
              <GameButton
                type="button"
                variant="secondary"
                onClick={() => {
                  armAudio();
                  onContinue();
                }}
                disabled={!latest}
                data-testid="title-continue"
              >
                {t("title.continue")}
                {latest ? ` · ${new Date(latest.savedAt).toLocaleString(locale)}` : ""}
              </GameButton>
            </div>
            <details
              className="title-more"
              open={showSecondaryActions}
              onToggle={(event) => setShowSecondaryActions(event.currentTarget.open)}
            >
              <summary data-testid="title-more-toggle">
                <span>{t("title.more")}</span>
                <small>{t("title.moreHint")}</small>
              </summary>
              <div className="title-secondary-actions">
                <GameButton
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    armAudio();
                    setShowSlots((value) => !value);
                  }}
                  data-testid="title-slots"
                >
                  {t("title.slots")}
                </GameButton>
                {showSlots ? (
                  <div className="title-slot-list" data-testid="title-slot-list">
                    <button
                      type="button"
                      className="title-slot-row"
                      disabled={!autosave}
                      onClick={() => {
                        armAudio();
                        if (autosave) {
                          onContinue(AUTOSAVE_SLOT);
                        }
                      }}
                    >
                      <span>{t("title.autosave")}</span>
                      <span>{formatSave(autosave, t("common.empty"), locale)}</span>
                    </button>
                    {MANUAL_SLOTS.map((slotId, index) => {
                      const save = manualSaves[index] ?? null;
                      return (
                        <button
                          key={slotId}
                          type="button"
                          className="title-slot-row"
                          disabled={!save}
                          onClick={() => {
                            armAudio();
                            if (save) {
                              onContinue(slotId as ManualSlotId);
                            }
                          }}
                        >
                          <span>
                            {t("title.manualSlot")} {index + 1}
                          </span>
                          <span>{formatSave(save, t("common.empty"), locale)}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                <GameButton
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    armAudio();
                    onOpenGallery();
                  }}
                  data-testid="title-gallery"
                >
                  {t("title.gallery")}
                </GameButton>
                <GameButton
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    armAudio();
                    onOpenSettings();
                  }}
                  data-testid="title-settings"
                >
                  {t("title.settings")}
                </GameButton>
                {onOpenAchievements ? (
                  <GameButton
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      armAudio();
                      onOpenAchievements();
                    }}
                    data-testid="title-achievements"
                  >
                    {t("title.achievements")}
                  </GameButton>
                ) : null}
                {onOpenAiSpend ? (
                  <GameButton
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      armAudio();
                      onOpenAiSpend();
                    }}
                    data-testid="title-ai-spend"
                  >
                    {t("title.aiSpend")}
                  </GameButton>
                ) : null}
                {onOpenHelp ? (
                  <GameButton
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      armAudio();
                      onOpenHelp();
                    }}
                    data-testid="title-help"
                  >
                    {t("title.help")}
                  </GameButton>
                ) : null}
                {onHostCoPlay && onJoinCoPlay ? (
                  <GameButton
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      armAudio();
                      setShowCoPlay((v) => !v);
                    }}
                    data-testid="title-coplay"
                  >
                    {t("title.coplay")}
                  </GameButton>
                ) : null}
                {showCoPlay && onHostCoPlay && onJoinCoPlay ? (
                  <div className="title-coplay-panel" data-testid="title-coplay-panel">
                    <p className="title-coplay-lead">
                      {t("title.coPlayLead")} {t("title.coPlayTransport")}{" "}
                      <strong>
                        {preferredTransportKind() === "realtime"
                          ? t("title.coPlayRealtime")
                          : t("title.coPlayLocal")}
                      </strong>{" "}
                      {t("title.coPlayFallback")}
                    </p>
                    <label className="title-coplay-field">
                      <span>{t("title.nickname")}</span>
                      <input
                        type="text"
                        maxLength={12}
                        value={coPlayAlias}
                        placeholder={t("title.guestAlias")}
                        onChange={(e) => setCoPlayAlias(e.target.value.slice(0, 12))}
                        data-testid="title-coplay-alias"
                      />
                    </label>
                    <GameButton
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        armAudio();
                        const code = makeRoomCode();
                        onHostCoPlay(code, coPlayAlias.trim() || t("title.hostAlias"));
                      }}
                      data-testid="title-coplay-host"
                    >
                      {t("title.createRoom")}
                    </GameButton>
                    <label className="title-coplay-field">
                      <span>{t("title.roomCode")}</span>
                      <input
                        type="text"
                        maxLength={6}
                        value={joinCode}
                        placeholder={t("title.roomCodeExample")}
                        onChange={(e) => setJoinCode(normalizeRoomCode(e.target.value))}
                        data-testid="title-coplay-code"
                      />
                    </label>
                    <GameButton
                      type="button"
                      variant="ghost"
                      disabled={normalizeRoomCode(joinCode).length < 4}
                      onClick={() => {
                        armAudio();
                        const code = normalizeRoomCode(joinCode);
                        if (code.length < 4) {
                          return;
                        }
                        onJoinCoPlay(code, coPlayAlias.trim() || t("title.guestAlias"));
                      }}
                      data-testid="title-coplay-join"
                    >
                      {t("title.joinRoom")}
                    </GameButton>
                  </div>
                ) : null}
              </div>
            </details>
          </div>
          <p className="title-footnote">{t("title.footnote")}</p>
          <p className="title-credits" data-testid="title-credits">
            {t("title.credits")}
          </p>
        </GamePanel>
      </div>
    </div>
  );
}
