import { useEffect, useRef } from "react";
import {
  canPlayDialogueVoiceResult,
  canStartDialogueVoiceRequest,
} from "../audio/dialogueVoiceGate";
import type { DialogueVoicePlaybackGuardApi } from "../audio/dialogueVoicePlaybackGuard";
import { DialogueVoiceSession } from "../audio/dialogueVoiceSession";
import { gameAudio } from "../audio/gameAudio";
import { hasMixedTtsRoutes, planBrowserTtsSegments } from "../audio/ttsSegmentation";

interface UseDialogueVoiceOptions {
  readonly enabled: boolean;
  /** Product master mute from settings/HUD — cancels in-flight TTS when true. */
  readonly masterMuted?: boolean;
  /** Reactive settings value; zero cancels and blocks the current line. */
  readonly voiceVolume: number;
  /** App-owned opportunity memory that survives Settings remounts. */
  readonly dialogueVoiceGuard: DialogueVoicePlaybackGuardApi;
  /** `${storyRevision}:${storyId}` — resets opportunity memory on new run. */
  readonly dialogueVoiceRunKey: string;
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
 * Positive-to-positive volume gain is not a dependency: App audio sync owns
 * gain; this hook only reacts to the boolean voiceEnabled transition.
 */
export function useDialogueVoice({
  enabled,
  masterMuted = false,
  voiceVolume,
  dialogueVoiceGuard,
  dialogueVoiceRunKey,
  isSignedIn,
  accessToken,
  text,
  speaker,
  language = "zh-CN",
  emotion,
  lineKey,
}: UseDialogueVoiceOptions): void {
  const sessionRef = useRef(new DialogueVoiceSession());
  const voiceEnabled = voiceVolume > 0;
  // Live volume for late-completion gates without re-running the effect on gain.
  const voiceVolumeRef = useRef(voiceVolume);
  voiceVolumeRef.current = voiceVolume;

  useEffect(() => {
    const session = sessionRef.current;
    session.cancel();
    gameAudio.stopVoice();

    const token = accessToken;
    const volumeAtStart = voiceVolumeRef.current;
    const startOk =
      Boolean(token) &&
      canStartDialogueVoiceRequest({
        enabled,
        masterMuted,
        isSignedIn,
        hasAccessToken: Boolean(token),
        hasText: Boolean(text.trim()),
        productMuted: gameAudio.isMuted(),
        voiceVolume: volumeAtStart,
      });

    const segments = planBrowserTtsSegments(text, language);
    const segmentsOk = segments.length > 0 && !hasMixedTtsRoutes(segments);
    const requestEligible = startOk && segmentsOk;

    // Always claim so volume-zero can suppress; only begin when opportunity is open.
    if (
      !dialogueVoiceGuard.claimLine({
        runKey: dialogueVoiceRunKey,
        lineKey,
        voiceEnabled,
        requestEligible,
      })
    ) {
      return;
    }

    // claimLine is true only when requestEligible was true (token + segments ready).
    const safeToken = token as string;
    const routedLanguage = segments[0]?.language ?? language;
    const routedText = segments
      .map((segment) => segment.text)
      .join(" ")
      .slice(0, 480);

    const ticket = session.begin();

    void import("../audio/ttsClient")
      .then(({ requestDialogueTts, speakerToCharacterId }) => {
        const liveVolume = voiceVolumeRef.current;
        if (
          !canPlayDialogueVoiceResult({
            isCurrent: session.isCurrent(ticket),
            productMuted: gameAudio.isMuted(),
            voiceVolume: liveVolume,
          })
        ) {
          if (session.isCurrent(ticket) && (gameAudio.isMuted() || liveVolume <= 0)) {
            session.cancel();
          }
          return null;
        }

        return requestDialogueTts({
          text: routedText,
          language: routedLanguage,
          characterId: speakerToCharacterId(speaker),
          emotion,
          accessToken: safeToken,
          signal: ticket.controller.signal,
        });
      })
      .then((result) => {
        if (
          !result ||
          !canPlayDialogueVoiceResult({
            isCurrent: session.isCurrent(ticket),
            productMuted: gameAudio.isMuted(),
            voiceVolume: voiceVolumeRef.current,
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
    // voiceVolume is intentionally omitted: positive-to-positive gain must not
    // cancel/restart synthesis. Boolean voiceEnabled covers 0 ↔ >0 transitions.
  }, [
    accessToken,
    dialogueVoiceGuard,
    dialogueVoiceRunKey,
    enabled,
    emotion,
    isSignedIn,
    language,
    lineKey,
    masterMuted,
    speaker,
    text,
    voiceEnabled,
  ]);
}
