import { useCallback, useEffect, useRef, useState } from "react";
import {
  CreatorApiError,
  fetchCreatorCasting,
  type CastingCharacter,
  type CastingDeskPayload,
} from "./api";

export function CastingDesk() {
  const [payload, setPayload] = useState<CastingDeskPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setPayload(await fetchCreatorCasting());
    } catch (err) {
      setError(err instanceof CreatorApiError ? err.message : "无法加载选角台数据。");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const playPreview = useCallback((character: CastingCharacter) => {
    if (!character.previewVoicePath) return;
    audioRef.current?.pause();
    const audio = new Audio(character.previewVoicePath);
    audioRef.current = audio;
    setPlayingId(character.id);
    audio.onended = () => setPlayingId((id) => (id === character.id ? null : id));
    audio.onerror = () => setPlayingId((id) => (id === character.id ? null : id));
    void audio.play().catch(() => setPlayingId(null));
  }, []);

  if (error) {
    return (
      <section className="creator-module-panel" data-testid="creator-casting-desk">
        <div className="creator-load-failure" role="alert">
          <h3>选角台读取失败</h3>
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
      <section className="creator-module-panel" data-testid="creator-casting-desk">
        <div className="creator-loading" role="status">
          正在装载角色、立绘与音色…
        </div>
      </section>
    );
  }

  return (
    <section className="creator-module-panel creator-casting-desk" data-testid="creator-casting-desk">
      <div className="creator-module-toolbar">
        <span className="creator-module-meta">
          {payload.characters.length} 角色 · 音色来自 CHINESE_VOICE_MAP · 试听来自预生成语音库
          （{payload.castIndexSource}）
        </span>
        <span className="creator-module-meta">只读 · 改音色是 P2</span>
      </div>

      <div className="creator-cast-grid">
        {payload.characters.map((character) => {
          const canPreview = Boolean(character.previewVoicePath);
          return (
            <article
              key={character.id}
              className="creator-cast-card"
              data-character-id={character.id}
            >
              <header className="creator-cast-card-header">
                <div>
                  <h3>{character.name}</h3>
                  <p>{character.description}</p>
                </div>
                <code>{character.id}</code>
              </header>

              <div className="creator-cast-portraits" aria-label={`${character.name} 立绘`}>
                {character.portraits.length ? (
                  character.portraits.map((portrait) => (
                    <figure key={portrait.stem} className="creator-cast-portrait">
                      <img src={portrait.publicPath} alt={portrait.stem} loading="lazy" />
                      <figcaption>{portrait.stem}</figcaption>
                    </figure>
                  ))
                ) : (
                  <p className="creator-empty-copy">无立绘文件</p>
                )}
              </div>

              <div className="creator-cast-voice-row">
                <div>
                  <span className="creator-cast-label">中文音色</span>
                  <strong>{character.voiceId ?? "（未分配）"}</strong>
                </div>
                <button
                  type="button"
                  className="creator-cast-preview-button"
                  disabled={!canPreview}
                  title={
                    canPreview
                      ? `试听 ${character.previewVoiceKey}`
                      : "该角色没有预生成语音条目"
                  }
                  onClick={() => playPreview(character)}
                  data-testid={`creator-cast-preview-${character.id}`}
                >
                  {!canPreview
                    ? "无预生成"
                    : playingId === character.id
                      ? "播放中…"
                      : "试听"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
