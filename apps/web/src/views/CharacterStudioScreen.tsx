import {
  GameBadge,
  GameButton,
  GameCallout,
  GamePanel,
  GameProgress,
  GameTextArea,
} from "@pieai/swimmer-ui-kit";
import { useCallback, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useLocale } from "../i18n";
import { createCharacterPackClient } from "../characters/characterPackClient";
import type {
  LockedCharacterBinding,
  StoryCharacterBindings,
} from "../characters/characterPackTypes";

export interface CharacterStudioSlot {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly roleKey?: string;
  readonly kind: "human" | "robot";
  readonly official: string;
}

export const LEAD_SLOTS: readonly CharacterStudioSlot[] = [
  {
    id: "lead_suming",
    name: "苏明",
    role: "男主角",
    roleKey: "characterStudio.maleLead",
    kind: "human",
    official: "/assets/portraits/suming-base.png",
  },
  {
    id: "lead_zhou_lu",
    // Keep in sync with packages/content/characters/slots.ts displayName
    // (contract test: tests/unit/character-slot-names.test.ts).
    name: "石佩欣",
    role: "女主角",
    roleKey: "characterStudio.femaleLead",
    kind: "human",
    official: "/assets/portraits/zhou-neutral.png",
  },
];

export const MAX_CHARACTER_REFERENCE_FILES = 3;
export const CHARACTER_FILE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

const CHARACTER_IMAGE_MIME_TYPES = new Set(CHARACTER_FILE_ACCEPT.split(","));
const CHARACTER_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif"]);

export type CharacterFileSelectionStatus = "empty" | "ready" | "warning" | "error";

export interface CharacterFileSelectionResult {
  readonly files: File[];
  readonly invalidCount: number;
  readonly trimmedCount: number;
  readonly status: CharacterFileSelectionStatus;
  readonly message: string;
}

export interface CharacterFileControlPresentation {
  readonly disabled: boolean;
  readonly triggerLabel: string;
  readonly statusText: string;
}

interface CharacterFileCopy {
  readonly selectReferences: string;
  readonly reselectReferences: string;
  readonly processingReferences: string;
  readonly noHumanReferences: string;
  readonly noRobotReferences: string;
  readonly noReferences: string;
  readonly unsupportedFiles: string;
  readonly overLimitFiles: string;
  readonly selectedFiles: string;
  readonly filesReady: string;
  readonly filesIgnored: string;
  readonly unsupportedOnlyPrefix: string;
  readonly unsupportedOnlySuffix: string;
}

const DEFAULT_CHARACTER_FILE_COPY: CharacterFileCopy = {
  selectReferences: "选择参考照片",
  reselectReferences: "重新选择照片",
  processingReferences: "正在处理，暂时无法更改参考照片。",
  noHumanReferences: "尚未选择照片；真人角色需要 1–3 张参考照片。",
  noRobotReferences: "尚未选择参考图；机器人角色也可以只填写形象说明。",
  noReferences: "尚未选择照片。",
  unsupportedFiles: "个类型不支持",
  overLimitFiles: "个超出上限",
  selectedFiles: "已选择",
  filesReady: "张，可以生成。",
  filesIgnored: "张；已忽略：",
  unsupportedOnlyPrefix: "未选择照片：",
  unsupportedOnlySuffix: "个文件类型不支持。请使用 JPG、PNG、WebP 或 AVIF。",
};

function formatCharacterFileSelection(
  selection: Pick<CharacterFileSelectionResult, "files" | "invalidCount" | "trimmedCount">,
  copy: CharacterFileCopy,
): string {
  if (selection.files.length === 0) {
    return selection.invalidCount > 0
      ? `${copy.unsupportedOnlyPrefix}${selection.invalidCount} ${copy.unsupportedOnlySuffix}`
      : copy.noReferences;
  }
  const ignoredParts = [
    selection.invalidCount > 0 ? `${selection.invalidCount} ${copy.unsupportedFiles}` : null,
    selection.trimmedCount > 0 ? `${selection.trimmedCount} ${copy.overLimitFiles}` : null,
  ].filter(Boolean);
  return ignoredParts.length > 0
    ? `${copy.selectedFiles} ${selection.files.length} ${copy.filesIgnored} ${ignoredParts.join(", ")}`
    : `${copy.selectedFiles} ${selection.files.length} ${copy.filesReady}`;
}

export function isAcceptedCharacterReference(file: Pick<File, "name" | "type">): boolean {
  const mimeType = file.type.trim().toLowerCase();
  if (mimeType) return CHARACTER_IMAGE_MIME_TYPES.has(mimeType);
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return CHARACTER_IMAGE_EXTENSIONS.has(extension);
}

export function normalizeCharacterReferenceFiles(
  selectedFiles: Iterable<File>,
): CharacterFileSelectionResult {
  const selected = Array.from(selectedFiles);
  const accepted = selected.filter(isAcceptedCharacterReference);
  const files = accepted.slice(0, MAX_CHARACTER_REFERENCE_FILES);
  const invalidCount = selected.length - accepted.length;
  const trimmedCount = Math.max(0, accepted.length - MAX_CHARACTER_REFERENCE_FILES);

  if (files.length === 0) {
    if (invalidCount > 0) {
      return {
        files,
        invalidCount,
        trimmedCount,
        status: "error",
        message: `未选择照片：${invalidCount} 个文件类型不支持。请使用 JPG、PNG、WebP 或 AVIF。`,
      };
    }
    return {
      files,
      invalidCount,
      trimmedCount,
      status: "empty",
      message: "尚未选择照片。",
    };
  }

  const ignoredParts = [
    invalidCount > 0 ? `${invalidCount} 个类型不支持` : null,
    trimmedCount > 0 ? `${trimmedCount} 个超出上限` : null,
  ].filter(Boolean);

  if (ignoredParts.length > 0) {
    return {
      files,
      invalidCount,
      trimmedCount,
      status: invalidCount > 0 ? "error" : "warning",
      message: `已选择 ${files.length} 张；${ignoredParts.join("、")}，已忽略。`,
    };
  }

  return {
    files,
    invalidCount,
    trimmedCount,
    status: "ready",
    message: `已选择 ${files.length} 张，可以生成。`,
  };
}

export function getCharacterFileControlPresentation(
  selection: CharacterFileSelectionResult,
  busy: boolean,
  kind: CharacterStudioSlot["kind"],
  copy: CharacterFileCopy = DEFAULT_CHARACTER_FILE_COPY,
): CharacterFileControlPresentation {
  return {
    disabled: busy,
    triggerLabel: selection.files.length > 0 ? copy.reselectReferences : copy.selectReferences,
    statusText: busy
      ? copy.processingReferences
      : selection.status === "empty"
        ? kind === "human"
          ? copy.noHumanReferences
          : copy.noRobotReferences
        : formatCharacterFileSelection(selection, copy),
  };
}

type SlotWork = {
  readonly packId?: string;
  readonly base?: { readonly id: string; readonly url: string };
  readonly binding?: LockedCharacterBinding;
  readonly official?: boolean;
};

export function CharacterStudioScreen({
  onComplete,
  onCancel,
  slots = LEAD_SLOTS,
  initialBindings = {},
  allowCancel = true,
}: {
  readonly onComplete: (bindings: StoryCharacterBindings) => void;
  readonly onCancel: () => void;
  readonly slots?: readonly CharacterStudioSlot[];
  readonly initialBindings?: StoryCharacterBindings;
  readonly allowCancel?: boolean;
}) {
  const auth = useAuth();
  const { t } = useLocale();
  const slotDisplayName = useCallback(
    (item: CharacterStudioSlot) => {
      if (item.id === "lead_suming") {
        return t("characterStudio.nameSuMing", item.name);
      }
      if (item.id === "lead_zhou_lu") {
        return t("characterStudio.nameShiPeixin", item.name);
      }
      return item.name;
    },
    [t],
  );
  const client = useMemo(
    () => createCharacterPackClient({ getAccessToken: auth.getAccessToken }),
    [auth.getAccessToken],
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [slotIndex, setSlotIndex] = useState(0);
  const [fileSelection, setFileSelection] = useState<CharacterFileSelectionResult>(() =>
    normalizeCharacterReferenceFiles([]),
  );
  const [brief, setBrief] = useState(() => t("characterStudio.defaultBrief"));
  const [works, setWorks] = useState<Record<string, SlotWork>>({});
  const [phase, setPhase] = useState<"idle" | "uploading" | "generating" | "moods">("idle");
  const [error, setError] = useState<string | null>(null);
  const slot = slots[slotIndex]!;
  const work = works[slot.id] ?? {};
  const busy = phase !== "idle";
  const files = fileSelection.files;
  const fileControl = getCharacterFileControlPresentation(fileSelection, busy, slot.kind, {
    selectReferences: t("characterStudio.selectReferences"),
    reselectReferences: t("characterStudio.reselectReferences"),
    processingReferences: t("characterStudio.processingReferences"),
    noHumanReferences: t("characterStudio.noHumanReferences"),
    noRobotReferences: t("characterStudio.noRobotReferences"),
    noReferences: t("characterStudio.noReferences"),
    unsupportedFiles: t("characterStudio.unsupportedFiles"),
    overLimitFiles: t("characterStudio.overLimitFiles"),
    selectedFiles: t("characterStudio.selectedFiles"),
    filesReady: t("characterStudio.filesReady"),
    filesIgnored: t("characterStudio.filesIgnored"),
    unsupportedOnlyPrefix: t("characterStudio.unsupportedOnlyPrefix"),
    unsupportedOnlySuffix: t("characterStudio.unsupportedOnlySuffix"),
  });
  const fileFieldId = `character-files-${slot.id}`;
  const fileLabelId = `${fileFieldId}-label`;
  const fileStatusId = `${fileFieldId}-status`;

  function resetFiles() {
    setFileSelection(normalizeCharacterReferenceFiles([]));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function moveNext(nextWorks: Record<string, SlotWork>) {
    if (slotIndex < slots.length - 1) {
      setSlotIndex((value) => value + 1);
      resetFiles();
      setError(null);
      return;
    }
    const bindings: Record<string, LockedCharacterBinding> = { ...initialBindings };
    for (const definition of slots) {
      const binding = nextWorks[definition.id]?.binding;
      if (binding) bindings[definition.id] = binding;
    }
    onComplete(bindings);
  }

  async function generate() {
    setError(null);
    if (!auth.isSignedIn) {
      if (!auth.configured) {
        setError(t("characterStudio.serviceUnavailable"));
        return;
      }
      await auth.signInGuest();
      setError(t("characterStudio.guestSignedIn"));
      return;
    }
    if ((slot.kind === "human" && files.length < 1) || files.length > 3) {
      setError(t("characterStudio.invalidHumanReferences"));
      return;
    }
    try {
      setPhase("uploading");
      let packId = work.packId;
      if (!packId) {
        const created = await client.createPack({
          clientPackId: crypto.randomUUID(),
          slotId: slot.id,
          brief,
        });
        packId = String(created.id);
        setWorks((current) => ({ ...current, [slot.id]: { ...current[slot.id], packId } }));
      }
      for (const [index, file] of files.entries()) {
        await client.uploadReference(packId, `reference-${index + 1}`, file);
      }
      setPhase("generating");
      const result = await client.generateBase(packId, {
        clientActionId: crypto.randomUUID(),
        kind: slot.kind,
        prompt: brief,
      });
      const asset = result.asset as { id?: unknown; url?: unknown };
      if (typeof asset.id !== "string" || typeof asset.url !== "string") {
        throw new Error(t("characterStudio.missingImage"));
      }
      setWorks((current) => ({
        ...current,
        [slot.id]: {
          ...current[slot.id],
          packId,
          base: { id: asset.id as string, url: asset.url as string },
        },
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("characterStudio.generationFailed"));
    } finally {
      setPhase("idle");
    }
  }

  async function approve() {
    if (!work.packId || !work.base) return;
    setError(null);
    setPhase("moods");
    try {
      await client.acceptBase(work.packId);
      const result = await client.generateMoodPack(work.packId, {
        clientActionId: crypto.randomUUID(),
        kind: slot.kind,
        prompt: t("characterStudio.moodPrompt"),
      });
      const moodUrls: Record<string, string> = {};
      for (const item of result.assets as readonly { moodKey?: unknown; url?: unknown }[]) {
        if (typeof item.moodKey === "string" && typeof item.url === "string")
          moodUrls[item.moodKey] = item.url;
      }
      const binding: LockedCharacterBinding = {
        slotId: slot.id,
        packId: work.packId,
        baseUrl: work.base.url,
        moodUrls,
        lockedAt: new Date().toISOString(),
      };
      const next = { ...works, [slot.id]: { ...work, binding } };
      setWorks(next);
      moveNext(next);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : t("characterStudio.moodGenerationFailed"),
      );
    } finally {
      setPhase("idle");
    }
  }

  function useOfficial() {
    const binding: LockedCharacterBinding = {
      slotId: slot.id,
      packId: `official:${slot.id}`,
      baseUrl: slot.official,
      moodUrls: {},
      lockedAt: new Date().toISOString(),
    };
    const next = { ...works, [slot.id]: { official: true, binding } };
    setWorks(next);
    moveNext(next);
  }

  return (
    <section
      className="character-studio"
      data-testid="character-studio"
      aria-labelledby="studio-title"
    >
      <div className="character-studio-backdrop" aria-hidden="true" />
      <header className="character-studio-header">
        <div>
          <GameBadge tone="ai">{t("characterStudio.badge")}</GameBadge>
          <h1 id="studio-title">{t("characterStudio.title")}</h1>
          <p>{t("characterStudio.lead")}</p>
        </div>
        {allowCancel ? (
          <GameButton type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            {t("characterStudio.back")}
          </GameButton>
        ) : null}
      </header>

      <div className="character-studio-steps" aria-label={t("characterStudio.progress")}>
        {slots.map((item, index) => (
          <span
            key={item.id}
            className={index === slotIndex ? "is-active" : works[item.id] ? "is-done" : ""}
          >
            {index + 1}. {slotDisplayName(item)}
          </span>
        ))}
      </div>

      <div className="character-studio-grid">
        <GamePanel
          className="character-studio-preview"
          tone="strong"
          data-testid="character-studio-preview"
        >
          <span className="character-studio-role">
            {slot.roleKey ? t(slot.roleKey, slot.role) : slot.role}
          </span>
          <img
            src={work.base?.url ?? slot.official}
            alt={`${slotDisplayName(slot)} ${t("characterStudio.previewAlt")}`}
          />
          <strong>{slotDisplayName(slot)}</strong>
          <small>
            {work.base ? t("characterStudio.baseWaiting") : t("characterStudio.officialDefault")}
          </small>
        </GamePanel>

        <GamePanel className="character-studio-controls" tone="strong">
          <h2>
            {work.base
              ? t("characterStudio.approvalTitle")
              : `${t("characterStudio.customize")} ${slotDisplayName(slot)}`}
          </h2>
          <p className="character-studio-scroll-note" data-testid="character-studio-scroll-note">
            {t("characterStudio.scrollNote")}
          </p>
          {work.base ? (
            <>
              <div className="character-studio-control-body">
                <p>{t("characterStudio.approvalBody")}</p>
              </div>
              <div className="character-studio-actions" data-testid="character-studio-actions">
                <GameButton
                  type="button"
                  variant="primary"
                  onClick={() => void approve()}
                  disabled={fileControl.disabled}
                >
                  {t("characterStudio.approve")}
                </GameButton>
                <GameButton
                  type="button"
                  variant="secondary"
                  onClick={() => void generate()}
                  disabled={busy}
                >
                  {t("characterStudio.regenerate")}
                </GameButton>
              </div>
            </>
          ) : (
            <>
              <div className="character-studio-control-body">
                <div
                  className="character-file-field"
                  role="group"
                  aria-labelledby={fileLabelId}
                  aria-busy={busy}
                >
                  <div className="character-file-heading">
                    <span id={fileLabelId}>
                      {slot.kind === "human"
                        ? t("characterStudio.humanReferences")
                        : t("characterStudio.robotReferences")}
                    </span>
                    <span className="character-file-count" aria-hidden="true">
                      {files.length} / {MAX_CHARACTER_REFERENCE_FILES}
                    </span>
                  </div>
                  <input
                    ref={fileInputRef}
                    id={fileFieldId}
                    className="character-file-input"
                    data-testid="character-file-input"
                    type="file"
                    accept={CHARACTER_FILE_ACCEPT}
                    multiple
                    disabled={fileControl.disabled}
                    tabIndex={-1}
                    aria-labelledby={fileLabelId}
                    aria-describedby={fileStatusId}
                    onChange={(event) => {
                      setError(null);
                      setFileSelection(
                        normalizeCharacterReferenceFiles(event.currentTarget.files ?? []),
                      );
                    }}
                  />
                  <div className="character-file-picker">
                    <div className="character-file-reel" aria-hidden="true">
                      {Array.from({ length: MAX_CHARACTER_REFERENCE_FILES }, (_, index) => (
                        <span key={index} className={index < files.length ? "is-filled" : ""}>
                          {index < files.length ? "✓" : index + 1}
                        </span>
                      ))}
                    </div>
                    <GameButton
                      type="button"
                      variant="secondary"
                      className="character-file-trigger"
                      data-testid="character-file-trigger"
                      disabled={busy}
                      aria-controls={fileFieldId}
                      aria-describedby={fileStatusId}
                      onClick={() => {
                        const input = fileInputRef.current;
                        if (!input || busy) return;
                        input.value = "";
                        input.click();
                      }}
                    >
                      {fileControl.triggerLabel}
                    </GameButton>
                  </div>
                  <p
                    id={fileStatusId}
                    data-testid="character-file-status"
                    className={`character-file-status is-${fileSelection.status}`}
                    role={fileSelection.status === "error" ? "alert" : "status"}
                    aria-live="polite"
                  >
                    {fileControl.statusText}
                  </p>
                  <small className="character-file-guidance">
                    {t("characterStudio.fileGuidance")}
                  </small>
                </div>
                <label className="character-brief-field">
                  <span>{t("characterStudio.briefLabel")}</span>
                  <GameTextArea
                    aria-label={t("characterStudio.briefLabel")}
                    value={brief}
                    onChange={(event) => setBrief(event.target.value)}
                    rows={4}
                    disabled={busy}
                  />
                </label>
                <GameCallout tone="info" heading={t("characterStudio.boundaryHeading")}>
                  {t("characterStudio.boundaryBody")}
                </GameCallout>
              </div>
              <div className="character-studio-actions" data-testid="character-studio-actions">
                <GameButton
                  type="button"
                  variant="primary"
                  onClick={() => void generate()}
                  disabled={busy}
                >
                  {t("characterStudio.generate")}
                </GameButton>
                <GameButton type="button" variant="ghost" onClick={useOfficial} disabled={busy}>
                  {t("characterStudio.useOfficial")}
                </GameButton>
              </div>
            </>
          )}
          {busy ? (
            <GameProgress
              label={
                phase === "moods"
                  ? t("characterStudio.progressMoods")
                  : phase === "uploading"
                    ? t("characterStudio.progressUpload")
                    : t("characterStudio.progressBase")
              }
              value={phase === "moods" ? 72 : phase === "generating" ? 48 : 22}
              tone="accent"
            />
          ) : null}
          {error ? (
            <p className="character-studio-error" role="alert" data-testid="character-studio-error">
              {error}
            </p>
          ) : null}
        </GamePanel>
      </div>
    </section>
  );
}
