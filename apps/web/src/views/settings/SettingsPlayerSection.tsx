/**
 * Player-facing settings only (language, account, audio, text, autoplay, commercial).
 * Lab / experimental tools live in SettingsLabSection.
 */

import {
  GameButton,
  GameCallout,
  GamePanel,
  GameSegmentedControl,
  GameToggle,
} from "@pieai/swimmer-ui-kit";
import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { gameAudio } from "../../audio/gameAudio";
import { LOCALE_META, useLocale, type AppLocale } from "../../i18n";
import {
  DEFAULT_DISPLAY_NAMES,
  type DisplayNameMap,
  sanitizeDisplayName,
} from "../../persistence/displayNames";
import type { GameSettings } from "../../persistence/settings";
import { VolumeRow } from "./VolumeRow";

export function SettingsPlayerSection({
  settings,
  onChange,
  displayNames,
  onDisplayNamesChange,
  onPreviewError,
}: {
  readonly settings: GameSettings;
  readonly onChange: (next: GameSettings) => void;
  readonly displayNames: DisplayNameMap;
  readonly onDisplayNamesChange: (next: DisplayNameMap) => void;
  readonly onPreviewError: (message: string | null) => void;
}) {
  const auth = useAuth();
  const { t, locale, setLocale } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reverb, setReverb] = useState(() => gameAudio.getReverbAmount());

  return (
    <>
      <GamePanel title={t("settings.language")} className="settings-panel">
        <p className="meta-lead">{t("settings.languageHint")}</p>
        <div className="settings-lang-grid" data-testid="settings-lang-grid">
          {LOCALE_META.map((meta) => (
            <button
              key={meta.id}
              type="button"
              className={locale === meta.id ? "settings-lang is-active" : "settings-lang"}
              data-testid={`settings-lang-${meta.id}`}
              onClick={() => setLocale(meta.id as AppLocale)}
            >
              <span>{meta.nativeLabel}</span>
              {!meta.ready ? <span className="settings-lang-tag">WIP</span> : null}
            </button>
          ))}
        </div>
      </GamePanel>

      <GamePanel title={t("settings.account")} className="settings-panel">
        {!auth.configured ? (
          <p className="meta-lead" data-testid="settings-auth-missing">
            未配置 VITE_SWIMMER_CORE_SUPABASE_URL / PUBLISHABLE_KEY — AI 灵感与电池不可用。
          </p>
        ) : auth.isSignedIn ? (
          <>
            <p className="meta-lead" data-testid="settings-auth-user">
              已登录
              {auth.user?.is_anonymous ? "（游客账号）" : ""} · id{" "}
              {(auth.user?.id ?? "").slice(0, 8)}…
              {auth.batteries !== null ? ` · 电池约 ${auth.batteries.toFixed(2)}` : ""}
            </p>
            <GameButton
              type="button"
              variant="ghost"
              disabled={auth.busy}
              onClick={() => void auth.signOutUser()}
              data-testid="settings-auth-signout"
            >
              退出登录
            </GameButton>
          </>
        ) : (
          <>
            <p className="meta-lead">
              预制主线免费。AI 灵感 / 联网同玩 / 生图需要登录（可先游客）。
            </p>
            <GameButton
              type="button"
              variant="primary"
              disabled={auth.busy}
              onClick={() => void auth.signInGuest()}
              data-testid="settings-auth-guest"
            >
              游客登录（一键）
            </GameButton>
            <label className="settings-name-field">
              <span className="settings-volume-label">邮箱</span>
              <input
                type="email"
                className="settings-name-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="settings-auth-email"
              />
            </label>
            <label className="settings-name-field">
              <span className="settings-volume-label">密码</span>
              <input
                type="password"
                className="settings-name-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="settings-auth-password"
              />
            </label>
            <GameButton
              type="button"
              variant="secondary"
              disabled={auth.busy || !email.trim() || password.length < 6}
              onClick={() => void auth.signInEmail(email.trim(), password)}
              data-testid="settings-auth-email-submit"
            >
              邮箱登录 / 注册
            </GameButton>
          </>
        )}
        {auth.error ? (
          <p className="meta-lead settings-pack-error" data-testid="settings-auth-error">
            {auth.error}
          </p>
        ) : null}
      </GamePanel>

      <GamePanel title={t("settings.names")} className="settings-panel">
        <label className="settings-name-field">
          <span className="settings-volume-label">男主显示名（默认 苏明）</span>
          <input
            type="text"
            className="settings-name-input"
            maxLength={12}
            value={displayNames.suming}
            data-testid="settings-name-suming"
            onChange={(event) =>
              onDisplayNamesChange({
                ...displayNames,
                suming: event.target.value,
              })
            }
            onBlur={() =>
              onDisplayNamesChange({
                ...displayNames,
                suming: sanitizeDisplayName(displayNames.suming, DEFAULT_DISPLAY_NAMES.suming),
              })
            }
          />
        </label>
        <label className="settings-name-field">
          <span className="settings-volume-label">女主显示名（默认 林晓棠）</span>
          <input
            type="text"
            className="settings-name-input"
            maxLength={12}
            value={displayNames.lin_xiaotang}
            data-testid="settings-name-lin"
            onChange={(event) =>
              onDisplayNamesChange({
                ...displayNames,
                lin_xiaotang: event.target.value,
              })
            }
            onBlur={() =>
              onDisplayNamesChange({
                ...displayNames,
                lin_xiaotang: sanitizeDisplayName(
                  displayNames.lin_xiaotang,
                  DEFAULT_DISPLAY_NAMES.lin_xiaotang,
                ),
              })
            }
          />
        </label>
        <GameButton
          type="button"
          variant="ghost"
          onClick={() => onDisplayNamesChange(DEFAULT_DISPLAY_NAMES)}
          data-testid="settings-name-reset"
        >
          恢复默认名字
        </GameButton>
        <p className="meta-lead">
          只改名牌与对白里的称呼显示，不改剧本逻辑 ID。配角（如周鹿）暂不可改。
        </p>
      </GamePanel>

      <GamePanel title={t("settings.audio")} className="settings-panel">
        <GameToggle
          label={settings.masterMuted ? t("settings.masterOff") : t("settings.masterOn")}
          checked={!settings.masterMuted}
          onClick={() => {
            gameAudio.unlock();
            onChange({ ...settings, masterMuted: !settings.masterMuted });
          }}
        />
        <VolumeRow
          label={t("settings.music")}
          hint="title-theme / soft-piano / chapter-end / scene beds"
          value={settings.musicVolume}
          testId="settings-music-volume"
          disabled={settings.masterMuted}
          onChange={(musicVolume) => {
            gameAudio.unlock();
            gameAudio.setMusicVolume(musicVolume);
            gameAudio.previewMusic();
            onChange({ ...settings, musicVolume });
          }}
        />
        <VolumeRow
          label={t("settings.ambient")}
          hint="reserved pad channel"
          value={settings.ambientVolume}
          testId="settings-ambient-volume"
          disabled={settings.masterMuted}
          onChange={(ambientVolume) => {
            gameAudio.unlock();
            gameAudio.setAmbientVolume(ambientVolume);
            gameAudio.previewAmbient();
            onChange({ ...settings, ambientVolume });
          }}
        />
        <VolumeRow
          label={t("settings.sfx")}
          value={settings.sfxVolume}
          testId="settings-sfx-volume"
          disabled={settings.masterMuted}
          onChange={(sfxVolume) => {
            gameAudio.unlock();
            gameAudio.setSfxVolume(sfxVolume);
            gameAudio.playSfx("ui-click", 0.8);
            onChange({ ...settings, sfxVolume });
          }}
        />
        <VolumeRow
          label={t("settings.voice")}
          hint="MiniMax · ElevenLabs"
          value={settings.voiceVolume}
          testId="settings-voice-volume"
          disabled={settings.masterMuted}
          onChange={(voiceVolume) => {
            gameAudio.setVoiceVolume(voiceVolume);
            onChange({ ...settings, voiceVolume });
          }}
        />
        <VolumeRow
          label={t("settings.reverb")}
          hint={t("settings.reverbHint")}
          value={reverb}
          testId="settings-reverb"
          disabled={settings.masterMuted}
          onChange={(next) => {
            gameAudio.unlock();
            setReverb(next);
            gameAudio.setReverbAmount(next);
          }}
        />
        <GameButton
          type="button"
          variant="secondary"
          disabled={settings.masterMuted || auth.busy || !auth.isSignedIn}
          data-testid="settings-tts-preview"
          onClick={() => {
            void (async () => {
              if (!auth.session?.access_token) {
                onPreviewError("Login required (guest OK)");
                return;
              }
              onPreviewError(null);
              try {
                const { requestTtsPreview } = await import("../../audio/ttsClient");
                gameAudio.unlock();
                const result = await requestTtsPreview({
                  previewId: locale === "en" ? "en_preview" : "zh_preview",
                  emotion: "calm",
                  accessToken: auth.session.access_token,
                });
                gameAudio.playVoiceFromBase64(result.audioBase64, result.mimeType, {
                  speaker: "苏明",
                });
              } catch (error) {
                const message = error instanceof Error ? error.message : "TTS failed";
                onPreviewError(
                  message.includes("Failed to fetch") || message.includes("Network")
                    ? "TTS offline: run `pnpm dev:full` (web + ai-branch)."
                    : `TTS: ${message.slice(0, 120)}`,
                );
              }
            })();
          }}
        >
          {auth.isSignedIn ? t("settings.ttsPreview") : t("settings.ttsNeedLogin")}
        </GameButton>
      </GamePanel>

      <GamePanel title={t("settings.textSpeed")} className="settings-panel">
        <GameSegmentedControl
          label={t("settings.textSpeed")}
          activeId={settings.textSpeed}
          onSelect={(id) =>
            onChange({
              ...settings,
              textSpeed: id as GameSettings["textSpeed"],
            })
          }
          options={[
            { id: "slow", label: t("settings.slow") },
            { id: "normal", label: t("settings.normal") },
            { id: "fast", label: t("settings.fast") },
          ]}
        />
      </GamePanel>

      <GamePanel title={t("settings.autoPlay")} className="settings-panel">
        <GameToggle
          label={settings.autoPlay ? t("settings.autoOn") : t("settings.autoOff")}
          checked={settings.autoPlay}
          onClick={() => onChange({ ...settings, autoPlay: !settings.autoPlay })}
        />
        <p className="meta-lead">{t("settings.autoHint")}</p>
      </GamePanel>

      <GamePanel title={t("settings.commercial")} className="settings-panel">
        <GameCallout tone="warning" heading={t("settings.wallet")}>
          {t("settings.walletHint")}
        </GameCallout>
        <p className="meta-lead">
          <strong>{t("settings.a11y")}</strong> — {t("settings.a11yHint")}
        </p>
        <p className="meta-lead">
          <strong>{t("settings.legal")}</strong> — {t("settings.legalHint")}
        </p>
        <p className="meta-lead">
          <strong>{t("settings.age")}</strong> — {t("settings.ageHint")}
        </p>
      </GamePanel>
    </>
  );
}
