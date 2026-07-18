import { useEffect, useMemo, useState } from "react";
import {
  CreatorApiError,
  openScenePreview,
  saveCreatorScene,
  type CreatorSceneMeta,
} from "./api";
import type { SceneAiBranchFields } from "./server/sceneManifestEdit";

interface SceneInspectorProps {
  readonly sceneId: string;
  readonly chapterId: string;
  readonly chapterLabel: string;
  readonly kindLabel: string;
  readonly title: string;
  readonly meta: CreatorSceneMeta | null;
  readonly onMetaChange: (meta: CreatorSceneMeta) => void;
  readonly rejoinSceneOptions: readonly string[];
}

interface DraftState {
  readonly speaker: string;
  readonly artKey: string;
  readonly videoKey: string;
  readonly aiEnabled: boolean;
  readonly waitLabel: string;
  readonly rejoinSceneId: string;
  readonly maxAiBeats: string;
  readonly context: string;
  readonly artPool: string;
  readonly portraitPool: string;
  readonly speakerPool: string;
}

interface SaveStatus {
  readonly tone: "idle" | "working" | "success" | "error";
  readonly message: string;
}

const EMPTY_DRAFT: DraftState = {
  speaker: "旁白",
  artKey: "",
  videoKey: "",
  aiEnabled: false,
  waitLabel: "灵感生成中…",
  rejoinSceneId: "",
  maxAiBeats: "2",
  context: "",
  artPool: "",
  portraitPool: "",
  speakerPool: "",
};

function splitList(value: string): string[] {
  return value
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function draftFromMeta(
  sceneId: string,
  meta: CreatorSceneMeta | null,
): DraftState {
  const scene = meta?.scenes[sceneId];
  if (!scene) return { ...EMPTY_DRAFT, rejoinSceneId: sceneId };
  const ai = scene.aiBranch;
  return {
    speaker: scene.speaker ?? "旁白",
    artKey: scene.artKey ?? "",
    videoKey: scene.videoKey ?? "",
    aiEnabled: Boolean(ai),
    waitLabel: ai?.waitLabel ?? "灵感生成中…",
    rejoinSceneId: ai?.rejoinSceneId ?? sceneId,
    maxAiBeats: String(ai?.maxAiBeats ?? 2),
    context: ai?.context ?? "",
    artPool: (ai?.artPool ?? []).join(", "),
    portraitPool: (ai?.portraitPool ?? []).join(", "),
    speakerPool: (ai?.speakerPool ?? []).join(", "),
  };
}

function explainError(error: unknown): string {
  if (error instanceof CreatorApiError) {
    if (error.code === "HASH_CONFLICT") {
      return "文件冲突：manifest 已被其他修改覆盖。请刷新后重试。";
    }
    if (error.code === "VALIDATION_FAILED") {
      return `校验失败：${error.message}`;
    }
    if (error.code === "SCENE_NOT_FOUND") {
      return "场景不在 production manifest 中（可能是 entry/terminal 虚拟节点）。";
    }
    return error.message;
  }
  return error instanceof Error ? error.message : "场景保存失败。";
}

export function SceneInspector({
  sceneId,
  chapterId,
  chapterLabel,
  kindLabel,
  title,
  meta,
  onMetaChange,
  rejoinSceneOptions,
}: SceneInspectorProps) {
  const sceneRecord = meta?.scenes[sceneId] ?? null;
  const [draft, setDraft] = useState<DraftState>(() => draftFromMeta(sceneId, meta));
  const [status, setStatus] = useState<SaveStatus>({ tone: "idle", message: "" });

  useEffect(() => {
    setDraft(draftFromMeta(sceneId, meta));
    setStatus({ tone: "idle", message: "" });
  }, [sceneId, meta]);

  const baseline = useMemo(() => draftFromMeta(sceneId, meta), [sceneId, meta]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const canSave =
    Boolean(sceneRecord) && dirty && status.tone !== "working" && Boolean(draft.speaker);

  const update = <K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setStatus({ tone: "idle", message: "" });
  };

  const save = async () => {
    if (!sceneRecord || !canSave) return;
    setStatus({ tone: "working", message: "正在写入 manifest 并跑 typecheck 闸门…" });
    try {
      let aiBranch: SceneAiBranchFields | null = null;
      if (draft.aiEnabled) {
        const maxAiBeats = Number(draft.maxAiBeats);
        if (!draft.rejoinSceneId.trim() || !draft.context.trim()) {
          setStatus({ tone: "error", message: "开启 AI 支线时必须填写 rejoinSceneId 与 context。" });
          return;
        }
        aiBranch = {
          enabled: true,
          waitLabel: draft.waitLabel.trim() || undefined,
          rejoinSceneId: draft.rejoinSceneId.trim(),
          maxAiBeats: Number.isFinite(maxAiBeats) ? maxAiBeats : undefined,
          context: draft.context.trim(),
          artPool: splitList(draft.artPool),
          portraitPool: splitList(draft.portraitPool),
          speakerPool: splitList(draft.speakerPool),
        };
      }
      // Only ship dirty keys so unrelated fields keep their original formatting.
      const fields: {
        speaker?: string;
        artKey?: string;
        videoKey?: string;
        aiBranch?: SceneAiBranchFields | null;
      } = {};
      if (draft.speaker !== baseline.speaker) {
        fields.speaker = draft.speaker;
      }
      if (draft.artKey !== baseline.artKey) {
        fields.artKey = draft.artKey || undefined;
      }
      if (draft.videoKey !== baseline.videoKey) {
        fields.videoKey = draft.videoKey || undefined;
      }
      const baselineAi = baseline.aiEnabled
        ? {
            enabled: true as const,
            waitLabel: baseline.waitLabel.trim() || undefined,
            rejoinSceneId: baseline.rejoinSceneId.trim(),
            maxAiBeats: Number(baseline.maxAiBeats) || undefined,
            context: baseline.context.trim(),
            artPool: splitList(baseline.artPool),
            portraitPool: splitList(baseline.portraitPool),
            speakerPool: splitList(baseline.speakerPool),
          }
        : null;
      if (JSON.stringify(aiBranch) !== JSON.stringify(baselineAi)) {
        fields.aiBranch = aiBranch;
      }
      if (Object.keys(fields).length === 0) {
        setStatus({ tone: "idle", message: "没有可保存的字段改动。" });
        return;
      }
      const next = await saveCreatorScene({
        sceneId,
        chapterId: sceneRecord.chapterId || chapterId,
        sourceHash: sceneRecord.sourceHash,
        fields,
      });
      onMetaChange(next);
      setStatus({ tone: "success", message: "场景字段已保存（manifest typecheck 通过）" });
    } catch (error) {
      setStatus({ tone: "error", message: explainError(error) });
    }
  };

  return (
    <section className="creator-scene-inspector" data-testid="creator-scene-inspector">
      <div className="creator-inspector-heading" data-testid="creator-selected-node">
        <div>
          <span>
            {chapterLabel} · {kindLabel}
          </span>
          <h3>{title}</h3>
        </div>
        <code>{sceneId}</code>
      </div>

      <div className="creator-preview-row">
        <button
          type="button"
          className="creator-preview-button"
          data-testid="creator-preview-scene"
          onClick={() => openScenePreview(sceneId)}
        >
          从此场景预览
        </button>
        <span>新标签 · prop-stage-fixture jumpTo</span>
      </div>

      {!sceneRecord ? (
        <p className="creator-empty-copy">
          此节点没有对应 production scene manifest 条目，只能查看拓扑与 Ink 文本。
        </p>
      ) : (
        <>
          <div className="creator-field-grid">
            <label>
              <span>说话人 speaker</span>
              <select
                data-testid="creator-scene-speaker"
                value={draft.speaker}
                onChange={(e) => update("speaker", e.target.value)}
              >
                {(meta?.speakers ?? []).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>画面 artKey</span>
              <select
                data-testid="creator-scene-artkey"
                value={draft.artKey}
                onChange={(e) => update("artKey", e.target.value)}
              >
                <option value="">（不设置）</option>
                {(meta?.artKeys ?? []).map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>视频 videoKey</span>
              <select
                data-testid="creator-scene-videokey"
                value={draft.videoKey}
                onChange={(e) => update("videoKey", e.target.value)}
              >
                <option value="">（不设置）</option>
                {(meta?.videoKeys ?? []).map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <section className="creator-detail-section">
            <div className="creator-section-title">
              <h4>AI 支线 aiBranch</h4>
              <label className="creator-check-filter creator-inline-check">
                <input
                  type="checkbox"
                  data-testid="creator-scene-ai-enabled"
                  checked={draft.aiEnabled}
                  onChange={(e) => update("aiEnabled", e.target.checked)}
                />
                <span>{draft.aiEnabled ? "开启" : "关闭"}</span>
              </label>
            </div>
            {draft.aiEnabled ? (
              <div className="creator-field-grid is-ai">
                <label>
                  <span>waitLabel</span>
                  <input
                    value={draft.waitLabel}
                    onChange={(e) => update("waitLabel", e.target.value)}
                  />
                </label>
                <label>
                  <span>rejoinSceneId</span>
                  <select
                    data-testid="creator-scene-rejoin"
                    value={draft.rejoinSceneId}
                    onChange={(e) => update("rejoinSceneId", e.target.value)}
                  >
                    {rejoinSceneOptions.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>maxAiBeats</span>
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={draft.maxAiBeats}
                    onChange={(e) => update("maxAiBeats", e.target.value)}
                  />
                </label>
                <label className="is-wide">
                  <span>context</span>
                  <textarea
                    rows={4}
                    value={draft.context}
                    onChange={(e) => update("context", e.target.value)}
                  />
                </label>
                <label className="is-wide">
                  <span>artPool（逗号分隔，须为 intake 资产 id）</span>
                  <input
                    value={draft.artPool}
                    onChange={(e) => update("artPool", e.target.value)}
                    placeholder="bg-office-night, bg-lobby-white"
                  />
                </label>
                <label className="is-wide">
                  <span>portraitPool（逗号分隔）</span>
                  <input
                    value={draft.portraitPool}
                    onChange={(e) => update("portraitPool", e.target.value)}
                  />
                </label>
                <label className="is-wide">
                  <span>speakerPool（逗号分隔）</span>
                  <input
                    value={draft.speakerPool}
                    onChange={(e) => update("speakerPool", e.target.value)}
                    placeholder="苏明, 旁白"
                  />
                </label>
              </div>
            ) : (
              <p className="creator-empty-copy">关闭后保存会移除该场景的 aiBranch 字段。</p>
            )}
          </section>

          <div className="creator-save-row">
            <p
              data-testid="creator-scene-save-status"
              className={`creator-save-status is-${status.tone}`}
              role="status"
            >
              {status.message || (dirty ? "有未保存的场景字段改动" : "场景字段与磁盘一致")}
            </p>
            <button
              type="button"
              data-testid="creator-scene-save"
              disabled={!canSave}
              onClick={() => void save()}
            >
              {status.tone === "working" ? "校验中…" : "保存场景字段"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
