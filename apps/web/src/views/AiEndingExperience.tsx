import {
  GameBadge,
  GameButton,
  GameModal,
  GameProgress,
  GameTextArea,
} from "@pieai/swimmer-ui-kit";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useAiEndingSession } from "../ai-ending/useAiEndingSession";
import type { StoryCharacterBindings } from "../characters/characterPackTypes";

export function AiEndingExperience({
  open,
  characterBindings,
  onClose,
}: {
  open: boolean;
  characterBindings: StoryCharacterBindings;
  onClose: () => void;
}) {
  const auth = useAuth();
  const ending = useAiEndingSession({ getAccessToken: auth.getAccessToken, characterBindings });
  const [freeText, setFreeText] = useState("");
  const busy = ending.status === "loading";
  return (
    <GameModal
      open={open}
      title="AI 最终章 · 非正史放映"
      size="lg"
      closeLabel="返回章节结算"
      onClose={onClose}
      closeOnBackdrop={false}
    >
      <div className="ai-ending-experience" data-testid="ai-ending-experience">
        <div className="ai-ending-meta">
          <GameBadge tone="ai">10–20 分钟 · 最多 8 段</GameBadge>
          <span>每次 AI 推进按现有点数规则记录；作者正文仍然免费。</span>
        </div>
        {ending.segments.length === 0 ? (
          <div className="ai-ending-start">
            <p>这不是预写结局。AI 会在作者规定的事实、人物性格和三个结局方向内继续发展。</p>
            <GameButton
              type="button"
              variant="primary"
              disabled={busy}
              onClick={() => void ending.start()}
            >
              {busy ? "正在规划结局…" : "开始我的最终章"}
            </GameButton>
          </div>
        ) : (
          <>
            <GameProgress
              label={`最终章进度 ${ending.current?.sequence ?? 0}/8`}
              value={ending.current?.sequence ?? 0}
              max={8}
              tone="accent"
              showValue
            />
            <article className="ai-ending-segment" aria-live="polite">
              <span>SEGMENT {ending.current?.sequence}</span>
              <p>{ending.current?.text}</p>
            </article>
            {!ending.current?.terminal ? (
              <div className="ai-ending-actions">
                <div className="ai-ending-choices">
                  {ending.current?.choices.map((choice) => (
                    <GameButton
                      key={choice.id}
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void ending.advance({ kind: "choice", choiceId: choice.id })}
                    >
                      {choice.label}
                    </GameButton>
                  ))}
                </div>
                <label>
                  <span>或者自己行动（最多 1000 字）</span>
                  <GameTextArea
                    aria-label="自由行动"
                    rows={3}
                    maxLength={1000}
                    value={freeText}
                    disabled={busy}
                    onChange={(event) => setFreeText(event.target.value)}
                  />
                </label>
                <GameButton
                  type="button"
                  variant="ghost"
                  disabled={busy || !freeText.trim()}
                  onClick={() => {
                    const text = freeText.trim();
                    setFreeText("");
                    void ending.advance({ kind: "free_text", text });
                  }}
                >
                  提交自由行动
                </GameButton>
              </div>
            ) : (
              <div className="ai-ending-terminal">
                <GameBadge tone="success">结局已生成</GameBadge>
                <p>方向：{ending.current.outcomeAnchor}</p>
              </div>
            )}
          </>
        )}
        {ending.error ? (
          <p className="character-studio-error" role="alert">
            {ending.error}
          </p>
        ) : null}
      </div>
    </GameModal>
  );
}
