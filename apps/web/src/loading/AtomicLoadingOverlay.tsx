import { useEffect, useMemo, useState } from "react";
import { ATOMIC_LOADING_DELAY_MS } from "./atomicLoading";
import "./loadingExperience.css";

export type AtomicLoadingKind = "title" | "casting" | "story" | "chapter" | "retry";

interface AtomicLoadingOverlayProps {
  readonly kind: AtomicLoadingKind;
  readonly error?: string | null;
  readonly onRetry?: () => void;
  readonly onRefresh?: () => void;
  readonly archiveIds?: readonly string[];
  readonly delayMs?: number;
}

interface LoadingCopy {
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
  readonly tip: string;
}

interface Dossier {
  readonly label: string;
  readonly title: string;
  readonly body: string;
}

const COPY: Record<AtomicLoadingKind, LoadingCopy> = {
  title: {
    eyebrow: "SupaLuv · 建立连接",
    title: "正在点亮夜班办公室",
    body: "关键代码、字体与首张画面会一起就绪，然后一次性进入标题。",
    tip: "加载完成即可离开，不需要等档案翻完。",
  },
  casting: {
    eyebrow: "角色协议 · 载入中",
    title: "正在打开选角工作台",
    body: "先确认苏明和石佩欣的形象；同一局里不会反复换脸。",
    tip: "真人照片仅限成年人，官方形象可直接开局。",
  },
  story: {
    eyebrow: "第一章 · 准备开场",
    title: "正在核对协议、灯光与存档",
    body: "故事运行时和首幕画面全部就绪后，才会完整换幕。",
    tip: "对白区可继续，系统菜单可随时存档。",
  },
  chapter: {
    eyebrow: "章间换幕",
    title: "正在把上一章的变量带进下一章",
    body: "当前完整画面会保留到下一间屋子、首图和剧情代码都准备好。",
    tip: "第一章结束不会触发 AI 最终章。",
  },
  retry: {
    eyebrow: "加载中断",
    title: "这次换幕没有完成",
    body: "当前画面仍然保留。可以重试；若游戏代码已更新，也可刷新并从存档恢复。",
    tip: "加载失败不会扣除 AI 电池。",
  },
};

const ARCHIVE_DOSSIERS: Readonly<Record<string, Dossier>> = {
  "protocol-terms": {
    label: "已解锁 · 协议条款",
    title: "亲密关系服务协议，第 7.3 条",
    body: "“自愿”已被系统定义为：在倒计时结束前没有找到退出按钮。法务认为这很浪漫。",
  },
  "barcode-shift": {
    label: "已解锁 · 条码夜班",
    title: "异常扫码记录",
    body: "同一件商品被扫了三次。机器说这是库存问题，人类说这是人生隐喻。",
  },
  "rental-receipt": {
    label: "已解锁 · 租房回执",
    title: "合租匹配附加费",
    body: "平台承诺只按“生活习惯”匹配，随后索要了睡姿、前任数量和牙膏挤法。",
  },
  "application-nda": {
    label: "已解锁 · 申请保密协议",
    title: "未发生关系保密条款",
    body: "双方同意对尚未发生、但算法已预测会发生的尴尬承担保密义务。",
  },
  "approval-sms": {
    label: "已解锁 · 审批短信",
    title: "系统批准了一次心动",
    body: "有效期十五分钟。逾期未使用，情绪额度将自动退回企业账户。",
  },
};

const RECOVERY_DOSSIER: Dossier = {
  label: "恢复协议",
  title: "先重试，再刷新",
  body: "重试会重新请求失败的 chunk 或图片；刷新则重新建立页面并读取现有存档。",
};

const WORLD_DOSSIERS: Record<AtomicLoadingKind, readonly Dossier[]> = {
  title: [
    {
      label: "世界观 · 夜班守则",
      title: "机器人不评判你，问卷会",
      body: "城市把亲密关系外包给算法之后，最稳定的伴侣变成了服务条款。",
    },
    {
      label: "世界观 · 电池协议",
      title: "作者剧情免费，真实 AI 才耗电",
      body: "失败、无效输出或没有交付的结果，不会被包装成一次成功消费。",
    },
  ],
  casting: [
    {
      label: "角色档案 · 形象锁定",
      title: "一局游戏，不反复换脸",
      body: "男女主在开局前确定形象；机器人会在作者指定的剧情节点加入。",
    },
    {
      label: "角色档案 · 真人边界",
      title: "只接受成年人的合规照片",
      body: "不接受未成年人、裸体或明显违规输入；备用官方形象始终可用。",
    },
  ],
  story: [
    {
      label: "协议漏洞 · 01",
      title: "“跳过”按钮必须真的能跳过",
      body: "小游戏和互动可以增加尴尬，但不能把玩家锁在作者主线之外。",
    },
    {
      label: "协议漏洞 · 02",
      title: "AI 支线必须知道回家的路",
      body: "短支线受约束并回到指定 Ink 节点；最终章才允许把终点当终点。",
    },
  ],
  chapter: [
    {
      label: "章间备忘 · 选择变量",
      title: "你的决定不会在黑屏里蒸发",
      body: "换章会携带已做选择、存档和角色绑定，再原子呈现下一幕。",
    },
    {
      label: "章间备忘 · 首图",
      title: "下载完成不等于已经能画出来",
      body: "首张背景必须完成 decode，避免新章节先出现拼装中的半幅画面。",
    },
  ],
  retry: [RECOVERY_DOSSIER],
};

const EMPTY_ARCHIVE_IDS: readonly string[] = [];

function dossiersFor(kind: AtomicLoadingKind, archiveIds: readonly string[]): readonly Dossier[] {
  const unlocked = archiveIds
    .map((id) => ARCHIVE_DOSSIERS[id])
    .filter((entry): entry is Dossier => Boolean(entry));
  return unlocked.length > 0 ? unlocked : WORLD_DOSSIERS[kind];
}

export function AtomicLoadingOverlay({
  kind,
  error,
  onRetry,
  onRefresh,
  archiveIds = EMPTY_ARCHIVE_IDS,
  delayMs = ATOMIC_LOADING_DELAY_MS,
}: AtomicLoadingOverlayProps) {
  const [revealed, setRevealed] = useState(Boolean(error));
  const [dossierIndex, setDossierIndex] = useState(0);
  const copy = COPY[kind];
  const dossiers = useMemo(() => dossiersFor(kind, archiveIds), [archiveIds, kind]);
  const dossier = dossiers[dossierIndex % dossiers.length] ?? RECOVERY_DOSSIER;

  useEffect(() => {
    setDossierIndex(0);
  }, [kind, dossiers]);

  useEffect(() => {
    if (error) {
      setRevealed(true);
      return;
    }
    setRevealed(false);
    const timer = window.setTimeout(() => setRevealed(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, error, kind]);

  if (!error && !revealed) {
    return (
      <div
        className="atomic-loading atomic-loading-shield"
        data-loading-shield={kind}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className="atomic-loading"
      data-testid={`atomic-loading-${kind}`}
      data-motion="ambient"
      role={error ? "alert" : "status"}
      aria-busy={!error}
      aria-live={error ? "assertive" : "polite"}
      aria-labelledby="atomic-loading-title"
    >
      <div className="atomic-loading-backdrop" aria-hidden="true" />
      <section className="atomic-loading-card">
        <p className="atomic-loading-eyebrow">{copy.eyebrow}</p>
        <h2 id="atomic-loading-title">{copy.title}</h2>
        <p className="atomic-loading-body">{error ?? copy.body}</p>
        {!error ? (
          <div className="atomic-loading-meter" aria-hidden="true">
            <span />
          </div>
        ) : null}

        <aside className="atomic-loading-dossier" data-testid="atomic-loading-dossier">
          <p className="atomic-loading-dossier-label">{dossier.label}</p>
          <h3>{dossier.title}</h3>
          <p>{dossier.body}</p>
          {dossiers.length > 1 ? (
            <button
              type="button"
              className="atomic-loading-dossier-next"
              onClick={() => setDossierIndex((value) => (value + 1) % dossiers.length)}
            >
              换一份档案
            </button>
          ) : null}
        </aside>

        <p className="atomic-loading-tip">{copy.tip}</p>
        {error && (onRetry || onRefresh) ? (
          <div className="atomic-loading-actions">
            {onRetry ? (
              <button type="button" className="atomic-loading-retry" onClick={onRetry}>
                重试加载
              </button>
            ) : null}
            {onRefresh ? (
              <button type="button" className="atomic-loading-refresh" onClick={onRefresh}>
                刷新并恢复
              </button>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
