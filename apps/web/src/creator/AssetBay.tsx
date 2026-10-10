import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CreatorApiError,
  fetchCreatorAssets,
  type CreatorAssetRecord,
  type CreatorAssetsPayload,
} from "./api";

const ALL = "all";

function statusTone(status: string): "prototype" | "pending" | "approved" | "other" {
  const s = status.toLowerCase();
  if (s.includes("prototype") || s === "ledger_only") return "prototype";
  if (s.includes("pending") || s.includes("unknown")) return "pending";
  if (s.includes("approv") || s.includes("demo_approved") || s === "ok") return "approved";
  return "other";
}

function isAudio(asset: CreatorAssetRecord): boolean {
  if (asset.kind === "audio") return true;
  const path = asset.publicPath ?? asset.path;
  return /\.(mp3|ogg|wav|m4a)$/i.test(path);
}

function isImage(asset: CreatorAssetRecord): boolean {
  if (isAudio(asset)) return false;
  const path = asset.publicPath ?? asset.path;
  return /\.(png|jpe?g|webp|gif|avif)$/i.test(path);
}

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function AssetBay() {
  const [payload, setPayload] = useState<CreatorAssetsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState(ALL);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setPayload(await fetchCreatorAssets());
    } catch (err) {
      setError(err instanceof CreatorApiError ? err.message : "无法加载资产湾数据。");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const assets = useMemo(() => payload?.assets ?? [], [payload]);
  const kinds = payload?.kinds ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return assets.filter((asset) => {
      if (kindFilter !== ALL && asset.kind !== kindFilter) return false;
      if (!q) return true;
      return [
        asset.id,
        asset.path,
        asset.notes,
        asset.kind,
        asset.qualityStatus,
        asset.rightsStatus,
      ]
        .join("\n")
        .toLocaleLowerCase()
        .includes(q);
    });
  }, [assets, kindFilter, query]);

  const selected = useMemo(
    () => assets.find((asset) => asset.id === selectedId) ?? null,
    [assets, selectedId],
  );

  if (error) {
    return (
      <section className="creator-module-panel" data-testid="creator-asset-bay">
        <div className="creator-load-failure" role="alert">
          <h3>资产湾读取失败</h3>
          <p>{error}</p>
          <button type="button" onClick={() => void load()}>
            重试
          </button>
        </div>
      </section>
    );
  }

  if (!payload) {
    return (
      <section className="creator-module-panel" data-testid="creator-asset-bay">
        <div className="creator-loading" role="status">
          正在装载三账资产…
        </div>
      </section>
    );
  }

  return (
    <section className="creator-module-panel creator-asset-bay" data-testid="creator-asset-bay">
      <div className="creator-module-toolbar">
        <label className="creator-search-field">
          <span>搜索资产</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="id / 路径 / 备注…"
            data-testid="creator-asset-search"
          />
        </label>
        <label>
          <span>类型</span>
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            data-testid="creator-asset-kind-filter"
          >
            <option value={ALL}>全部类型</option>
            {kinds.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </label>
        <span className="creator-module-meta">
          {filtered.length} / {assets.length} 项 · 只读
        </span>
      </div>

      <div className="creator-asset-layout">
        <div className="creator-asset-grid" role="list">
          {filtered.map((asset) => (
            <button
              key={asset.id}
              type="button"
              role="listitem"
              className={`creator-asset-card${selectedId === asset.id ? " is-selected" : ""}`}
              onClick={() => setSelectedId(asset.id)}
              data-asset-id={asset.id}
            >
              <div className="creator-asset-thumb">
                {isImage(asset) && asset.publicPath ? (
                  <img src={asset.publicPath} alt="" loading="lazy" />
                ) : isAudio(asset) ? (
                  <span className="creator-asset-audio-icon" aria-hidden>
                    ♪
                  </span>
                ) : (
                  <span className="creator-asset-missing">无预览</span>
                )}
              </div>
              <div className="creator-asset-card-body">
                <strong>{asset.id}</strong>
                <code>{asset.kind}</code>
                <div className="creator-status-chips">
                  <span className={`creator-status-chip is-${statusTone(asset.qualityStatus)}`}>
                    Q:{asset.qualityStatus}
                  </span>
                  <span className={`creator-status-chip is-${statusTone(asset.rightsStatus)}`}>
                    R:{asset.rightsStatus}
                  </span>
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 ? <p className="creator-empty-copy">没有匹配的资产。</p> : null}
        </div>

        <aside className="creator-asset-detail" aria-label="资产详情">
          {selected ? (
            <>
              <div className="creator-asset-detail-preview">
                {isImage(selected) && selected.publicPath ? (
                  <img src={selected.publicPath} alt={selected.id} />
                ) : isAudio(selected) && selected.publicPath ? (
                  <div className="creator-asset-audio-player">
                    <span className="creator-asset-audio-icon large" aria-hidden>
                      ♪
                    </span>
                    <audio controls src={selected.publicPath} preload="none">
                      浏览器不支持音频预览
                    </audio>
                  </div>
                ) : (
                  <p className="creator-empty-copy">无预览文件（路径可能在 public 之外）。</p>
                )}
              </div>
              <h3>{selected.id}</h3>
              <dl className="creator-asset-fields">
                <div>
                  <dt>kind</dt>
                  <dd>{selected.kind}</dd>
                </div>
                <div>
                  <dt>path</dt>
                  <dd>
                    <code>{selected.path || "—"}</code>
                  </dd>
                </div>
                <div>
                  <dt>publicPath</dt>
                  <dd>
                    <code>{selected.publicPath ?? "—"}</code>
                  </dd>
                </div>
                <div>
                  <dt>qualityStatus</dt>
                  <dd>
                    <span
                      className={`creator-status-chip is-${statusTone(selected.qualityStatus)}`}
                    >
                      {selected.qualityStatus}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>rightsStatus</dt>
                  <dd>
                    <span className={`creator-status-chip is-${statusTone(selected.rightsStatus)}`}>
                      {selected.rightsStatus}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>bytes</dt>
                  <dd>{formatBytes(selected.bytes)}</dd>
                </div>
                <div>
                  <dt>sha256</dt>
                  <dd>
                    <code>{selected.sha256 ?? "—"}</code>
                  </dd>
                </div>
                <div>
                  <dt>fileStatus</dt>
                  <dd>{selected.fileStatus ?? "—"}</dd>
                </div>
                <div>
                  <dt>sources</dt>
                  <dd>{selected.sources.join(" + ")}</dd>
                </div>
                <div>
                  <dt>ledger release</dt>
                  <dd>{selected.ledgerReleaseStatus ?? "—"}</dd>
                </div>
                <div>
                  <dt>ledger source</dt>
                  <dd>{selected.ledgerSource ?? "—"}</dd>
                </div>
                <div>
                  <dt>notes</dt>
                  <dd>{selected.notes || "—"}</dd>
                </div>
              </dl>
            </>
          ) : (
            <div className="creator-inspector-empty">
              <h3>选择一项资产</h3>
              <p>点网格缩略图查看大图与台账字段。本模块只读，不写盘。</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
