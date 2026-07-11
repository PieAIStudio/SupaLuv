import {
  GameBadge,
  GameButton,
  GameCallout,
  GamePanel,
  GameProgress,
  GameTextArea,
} from "@pieai/swimmer-ui-kit";
import { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { createCharacterPackClient } from "../characters/characterPackClient";
import type {
  LockedCharacterBinding,
  StoryCharacterBindings,
} from "../characters/characterPackTypes";

export interface CharacterStudioSlot {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly kind: "human" | "robot";
  readonly official: string;
}

const LEAD_SLOTS: readonly CharacterStudioSlot[] = [
  {
    id: "lead_suming",
    name: "苏明",
    role: "男主角",
    kind: "human",
    official: "/assets/portraits/suming-base.png",
  },
  {
    id: "lead_zhou_lu",
    name: "周鹿",
    role: "女主角",
    kind: "human",
    official: "/assets/portraits/zhou-neutral.png",
  },
];

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
  const client = useMemo(
    () => createCharacterPackClient({ getAccessToken: auth.getAccessToken }),
    [auth.getAccessToken],
  );
  const [slotIndex, setSlotIndex] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [brief, setBrief] = useState("25岁以上，电影感半身肖像，保留本人主要面部特征");
  const [works, setWorks] = useState<Record<string, SlotWork>>({});
  const [phase, setPhase] = useState<"idle" | "uploading" | "generating" | "moods">("idle");
  const [error, setError] = useState<string | null>(null);
  const slot = slots[slotIndex]!;
  const work = works[slot.id] ?? {};
  const busy = phase !== "idle";

  function moveNext(nextWorks: Record<string, SlotWork>) {
    if (slotIndex < slots.length - 1) {
      setSlotIndex((value) => value + 1);
      setFiles([]);
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
        setError("AI 形象服务尚未配置；你仍可使用官方形象开始游戏。");
        return;
      }
      await auth.signInGuest();
      setError("游客登录已完成，请再点一次“生成基准形象”。");
      return;
    }
    if ((slot.kind === "human" && files.length < 1) || files.length > 3) {
      setError("请选择 1–3 张只包含你本人的清晰成年照片。");
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
        throw new Error("生成结果缺少可显示图片");
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
      setError(caught instanceof Error ? caught.message : "生成失败，请重试");
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
        prompt: "保持身份、年龄、服装和画风一致，只改变表情与轻微姿态。",
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
      setError(caught instanceof Error ? caught.message : "情绪形象生成失败，请重试");
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
          <GameBadge tone="ai">AI CASTING LAB</GameBadge>
          <h1 id="studio-title">先选演员，再开机</h1>
          <p>主角形象只在新游戏前确定；本局开始后将锁定，保证故事中的人物始终是同一个人。</p>
        </div>
        {allowCancel ? (
          <GameButton type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            返回标题
          </GameButton>
        ) : null}
      </header>

      <div className="character-studio-steps" aria-label="角色进度">
        {slots.map((item, index) => (
          <span
            key={item.id}
            className={index === slotIndex ? "is-active" : works[item.id] ? "is-done" : ""}
          >
            {index + 1}. {item.name}
          </span>
        ))}
      </div>

      <div className="character-studio-grid">
        <GamePanel className="character-studio-preview" tone="strong">
          <span className="character-studio-role">{slot.role}</span>
          <img src={work.base?.url ?? slot.official} alt={`${slot.name}当前形象预览`} />
          <strong>{slot.name}</strong>
          <small>{work.base ? "AI 基准形象 · 等待确认" : "官方默认形象"}</small>
        </GamePanel>

        <GamePanel className="character-studio-controls" tone="strong">
          <h2>{work.base ? "这张脸可以演十小时吗？" : `定制${slot.name}`}</h2>
          {work.base ? (
            <>
              <p>
                确认后会继续生成六种常用表情；不满意可以重新生成，已发生的 AI
                调用会按现有点数规则记录。
              </p>
              <div className="character-studio-actions">
                <GameButton
                  type="button"
                  variant="primary"
                  onClick={() => void approve()}
                  disabled={busy}
                >
                  确认并生成表情
                </GameButton>
                <GameButton
                  type="button"
                  variant="secondary"
                  onClick={() => void generate()}
                  disabled={busy}
                >
                  重新生成
                </GameButton>
              </div>
            </>
          ) : (
            <>
              <label className="character-file-field">
                <span>
                  {slot.kind === "human"
                    ? "真人参考照片（1–3 张）"
                    : "机器人参考图（可选，最多 3 张）"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  multiple
                  disabled={busy}
                  onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 3))}
                />
                <small>
                  {files.length > 0
                    ? `已选择 ${files.length} 张`
                    : slot.kind === "human"
                      ? "每张只放一个清晰成年面孔；原图可删除，180 天未使用自动清理。"
                      : "可以只写说明，也可以上传外观参考图。"}
                </small>
              </label>
              <label className="character-brief-field">
                <span>形象说明</span>
                <GameTextArea
                  aria-label="形象说明"
                  value={brief}
                  onChange={(event) => setBrief(event.target.value)}
                  rows={4}
                  disabled={busy}
                />
              </label>
              <GameCallout tone="info" heading="内容边界">
                仅上传你有权使用的清晰成年人参考图；未成年人、裸体、色情或无法确认成年人的照片不能使用。
              </GameCallout>
              <div className="character-studio-actions">
                <GameButton
                  type="button"
                  variant="primary"
                  onClick={() => void generate()}
                  disabled={busy}
                >
                  生成基准形象
                </GameButton>
                <GameButton type="button" variant="ghost" onClick={useOfficial} disabled={busy}>
                  使用官方形象
                </GameButton>
              </div>
            </>
          )}
          {busy ? (
            <GameProgress
              label={
                phase === "moods"
                  ? "正在统一生成六种表情"
                  : phase === "uploading"
                    ? "正在安全上传"
                    : "正在生成基准形象"
              }
              value={phase === "moods" ? 72 : phase === "generating" ? 48 : 22}
              tone="accent"
            />
          ) : null}
          {error ? (
            <p className="character-studio-error" role="alert">
              {error}
            </p>
          ) : null}
        </GamePanel>
      </div>
    </section>
  );
}
