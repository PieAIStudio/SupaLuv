export type AtomicLoadingKind = "title" | "casting" | "story" | "chapter" | "retry";

interface AtomicLoadingOverlayProps {
  readonly kind: AtomicLoadingKind;
  readonly error?: string | null;
  readonly onRetry?: () => void;
}

const COPY: Record<
  AtomicLoadingKind,
  { eyebrow: string; title: string; body: string; tip: string }
> = {
  title: {
    eyebrow: "SupaLuv · 建立连接",
    title: "正在点亮夜班办公室",
    body: "先把完整画面备齐，再让你进入这场不太体面的亲密实验。",
    tip: "操作提示：回车、空格和点击都能继续。",
  },
  casting: {
    eyebrow: "角色协议 · 载入中",
    title: "正在打开选角工作台",
    body: "先确认苏明和周颖的形象；同一局里不会反复换脸。",
    tip: "设定提示：真人照片仅限成年人，官方形象可直接开局。",
  },
  story: {
    eyebrow: "第一章 · 准备开场",
    title: "正在核对协议、灯光与存档",
    body: "故事、首幕画面和运行时代码会一起就绪，然后一次性换幕。",
    tip: "操作提示：对白区可继续，系统菜单可随时存档。",
  },
  chapter: {
    eyebrow: "章间换幕",
    title: "正在把上一章的变量带进下一章",
    body: "保留你已经做出的选择，再加载下一间屋子和新的尴尬。",
    tip: "设定提示：第一章结束不会触发 AI 最终章。",
  },
  retry: {
    eyebrow: "加载中断",
    title: "这次换幕没有完成",
    body: "当前画面仍然保留。你可以重试，或刷新后从自动存档继续。",
    tip: "不会因为加载失败扣除 AI 电池。",
  },
};

export function AtomicLoadingOverlay({ kind, error, onRetry }: AtomicLoadingOverlayProps) {
  const copy = COPY[kind];
  return (
    <div
      className="atomic-loading"
      data-testid={`atomic-loading-${kind}`}
      data-motion="ambient"
      role={error ? "alert" : "status"}
      aria-live="polite"
    >
      <div className="atomic-loading-backdrop" aria-hidden="true" />
      <section className="atomic-loading-card">
        <p className="atomic-loading-eyebrow">{copy.eyebrow}</p>
        <h2>{copy.title}</h2>
        <p className="atomic-loading-body">{error ?? copy.body}</p>
        <div className="atomic-loading-meter" aria-hidden="true">
          <span />
        </div>
        <p className="atomic-loading-tip">{copy.tip}</p>
        {error && onRetry ? (
          <button type="button" className="atomic-loading-retry" onClick={onRetry}>
            重试加载
          </button>
        ) : null}
      </section>
    </div>
  );
}
