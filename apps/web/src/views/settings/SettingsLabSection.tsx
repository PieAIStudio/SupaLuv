/**
 * Developer / experimental settings (local portrait pack, unmetered notes).
 * Player-facing names stay in SettingsPlayerSection (always visible).
 */

import { GameButton, GamePanel } from "@pieai/swimmer-ui-kit";
import { useState } from "react";
import { useLocale } from "../../i18n";
import {
  clearPortraitPack,
  fileToPortraitDataUrl,
  hasCustomPortraitPack,
  setLeadOverride,
  type LeadSlotId,
  type PortraitPackState,
} from "../../persistence/portraitPack";

export function SettingsLabSection({
  portraitPack,
  onPortraitPackChange,
  previewError,
}: {
  readonly portraitPack: PortraitPackState;
  readonly onPortraitPackChange: (next: PortraitPackState) => void;
  readonly previewError: string | null;
}) {
  const { t } = useLocale();
  const [packBusy, setPackBusy] = useState<LeadSlotId | null>(null);
  const [packError, setPackError] = useState<string | null>(null);

  async function handlePackUpload(slot: LeadSlotId, file: File | null) {
    if (!file) {
      return;
    }
    setPackBusy(slot);
    setPackError(null);
    try {
      const dataUrl = await fileToPortraitDataUrl(file);
      onPortraitPackChange(setLeadOverride(portraitPack, slot, dataUrl));
    } catch (err) {
      setPackError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setPackBusy(null);
    }
  }

  return (
    <details className="settings-lab" data-testid="settings-lab">
      <summary>Developer Lab（生产可藏）</summary>

      <GamePanel title={t("settings.pack")} className="settings-panel">
        <p className="meta-lead">
          上传一张图覆盖该主角所有 mood 立绘（本机缓存，非 AI 生图）。 启用后会跳过含主角正脸的官方
          Event CG，避免脸不一致。
        </p>
        {(
          [
            { slot: "suming" as const, label: "男主覆盖图" },
            { slot: "lin_xiaotang" as const, label: "女主覆盖图" },
          ] as const
        ).map(({ slot, label }) => (
          <label key={slot} className="settings-name-field">
            <span className="settings-volume-label">
              {label}
              {portraitPack.byLead[slot] ? " · 已覆盖" : " · 官方默认"}
            </span>
            <input
              type="file"
              accept="image/*"
              data-testid={`settings-pack-${slot}`}
              disabled={packBusy !== null}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                void handlePackUpload(slot, file);
                event.target.value = "";
              }}
            />
            {portraitPack.byLead[slot] ? (
              <img
                className="settings-pack-preview"
                src={portraitPack.byLead[slot]}
                alt=""
                width={72}
                height={72}
              />
            ) : null}
          </label>
        ))}
        {packError || previewError ? (
          <p className="meta-lead settings-pack-error">{packError ?? previewError}</p>
        ) : null}
        {packBusy ? <p className="meta-lead">处理中…</p> : null}
        <GameButton
          type="button"
          variant="ghost"
          disabled={!hasCustomPortraitPack(portraitPack)}
          onClick={() => {
            onPortraitPackChange(clearPortraitPack());
            setPackError(null);
          }}
          data-testid="settings-pack-clear"
        >
          清除本机立绘覆盖
        </GameButton>
      </GamePanel>

      <GamePanel title="本地调试" className="settings-panel">
        <p className="meta-lead">
          本地免计费：`VITE_SUPALUV_AI_ALLOW_UNMETERED=1` + 服务端
          `SUPALUV_WALLET_OPTIONAL=1`（勿用于生产）。
        </p>
      </GamePanel>
    </details>
  );
}
