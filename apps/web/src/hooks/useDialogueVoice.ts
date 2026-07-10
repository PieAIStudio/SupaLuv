import { useEffect, useRef } from "react";
import { gameAudio } from "../audio/gameAudio";
import { requestDialogueTts, speakerToCharacterId } from "../audio/ttsClient";

interface UseDialogueVoiceOptions {
  readonly enabled: boolean;
  readonly isSignedIn: boolean;
  readonly accessToken: string | null;
  readonly text: string;
  readonly speaker: string;
  readonly language?: string;
  readonly emotion?: string;
  /** Bump when a new line should speak (e.g. beat index / scene id). */
  readonly lineKey: string;
}

/**
 * Speak the current dialogue line via dual TTS edge when logged in.
 * Failures are silent — subtitles remain the source of truth.
 */
export function useDialogueVoice({
  enabled,
  isSignedIn,
  accessToken,
  text,
  speaker,
  language = "zh-CN",
  emotion,
  lineKey,
}: UseDialogueVoiceOptions): void {
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    gameAudio.stopVoice();

    if (!enabled || !isSignedIn || !accessToken || !text.trim()) {
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const characterId = speakerToCharacterId(speaker);

    void requestDialogueTts({
      text: text.slice(0, 480),
      language,
      characterId,
      emotion,
      accessToken,
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }
        gameAudio.unlock();
        gameAudio.playVoiceFromBase64(result.audioBase64, result.mimeType, {
          speaker,
        });
      })
      .catch(() => {
        // subtitle-only fallback
      });

    return () => {
      controller.abort();
      gameAudio.stopVoice();
    };
  }, [accessToken, enabled, emotion, isSignedIn, language, lineKey, speaker, text]);
}
