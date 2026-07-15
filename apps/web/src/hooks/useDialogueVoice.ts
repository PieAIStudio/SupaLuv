import { useEffect, useRef } from "react";
import {
  canPlayDialogueVoiceResult,
  canStartDialogueVoiceRequest,
} from "../audio/dialogueVoiceGate";
import { DialogueVoiceSession } from "../audio/dialogueVoiceSession";
import { gameAudio } from "../audio/gameAudio";
import { hasMixedTtsRoutes, planBrowserTtsSegments } from "../audio/ttsSegmentation";

interface UseDialogueVoiceOptions {
  readonly enabled: boolean;
  /** Product master mute from settings/HUD — cancels in-flight TTS when true. */
  readonly masterMuted?: boolean;
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
 *
 * Master mute and voice volume=0 abort the active session so a late network
 * completion cannot resurrect audio or imply a delivered billable clip.
 */
export function useDialogueVoice({
  enabled,
  masterMuted = false,
  isSignedIn,
  accessToken,
  text,
  speaker,
  language = "zh-CN",
  emotion,
  lineKey,
}: UseDialogueVoiceOptions): void {
  const sessionRef = useRef(new DialogueVoiceSession());

  useEffect(() => {
    const session = sessionRef.current;
    session.cancel();
    gameAudio.stopVoice();

    const token = accessToken;
    if (
      !token ||
      !canStartDialogueVoiceRequest({
        enabled,
        masterMuted,
        isSignedIn,
        hasAccessToken: Boolean(token),
        hasText: Boolean(text.trim()),
        productMuted: gameAudio.isMuted(),
        voiceVolume: gameAudio.getVoiceVolume(),
      })
    ) {
      return;
    }

    const segments = planBrowserTtsSegments(text, language);
    if (segments.length === 0 || hasMixedTtsRoutes(segments)) {
      return;
    }
    const routedLanguage = segments[0]?.language ?? language;
    const routedText = segments
      .map((segment) => segment.text)
      .join(" ")
      .slice(0, 480);

    const ticket = session.begin();

    void import("../audio/ttsClient")
      .then(({ requestDialogueTts, speakerToCharacterId }) => {
        if (
          !canPlayDialogueVoiceResult({
            isCurrent: session.isCurrent(ticket),
            productMuted: gameAudio.isMuted(),
            voiceVolume: gameAudio.getVoiceVolume(),
          })
        ) {
          if (session.isCurrent(ticket) && (gameAudio.isMuted() || gameAudio.getVoiceVolume() <= 0)) {
            session.cancel();
          }
          return null;
        }

        return requestDialogueTts({
          text: routedText,
          language: routedLanguage,
          characterId: speakerToCharacterId(speaker),
          emotion,
          accessToken: token,
          signal: ticket.controller.signal,
        });
      })
      .then((result) => {
        if (
          !result ||
          !canPlayDialogueVoiceResult({
            isCurrent: session.isCurrent(ticket),
            productMuted: gameAudio.isMuted(),
            voiceVolume: gameAudio.getVoiceVolume(),
          })
        ) {
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
      session.cancel();
      gameAudio.stopVoice();
    };
  }, [
    accessToken,
    enabled,
    emotion,
    isSignedIn,
    language,
    lineKey,
    masterMuted,
    speaker,
    text,
  ]);
}
