import { useEffect, useRef, useState } from "react";
import {
  canPlayDialogueVoiceResult,
  canStartDialogueVoiceRequest,
  dialogueVoiceButtonState,
} from "../audio/dialogueVoiceGate";
import type { DialogueVoicePlaybackGuardApi } from "../audio/dialogueVoicePlaybackGuard";
import { DialogueVoiceSession } from "../audio/dialogueVoiceSession";
import { gameAudio } from "../audio/gameAudio";
import { getCachedTtsCapability, loadTtsCapability } from "../audio/ttsCapability";
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

export interface DialogueVoiceUiState {
  /** null while health capability is loading. */
  readonly freeformEnabled: boolean | null;
  readonly buttonDisabled: boolean;
  readonly buttonVisible: boolean;
  readonly buttonTooltipKey: "play.voiceBudgetCharging" | null;
}

/**
 * Speak the current dialogue line via dual TTS edge when logged in and free-form
 * TTS is enabled server-side. Failures are silent — subtitles remain the source
 * of truth. When free-form is off, no synthesize request is made (no 400 spam).
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
}: UseDialogueVoiceOptions): DialogueVoiceUiState {
  const sessionRef = useRef(new DialogueVoiceSession());
  const voiceEnabled = voiceVolume > 0;
  // Live volume for late-completion gates without re-running the effect on gain.
  const voiceVolumeRef = useRef(voiceVolume);
  voiceVolumeRef.current = voiceVolume;

  const [freeformEnabled, setFreeformEnabled] = useState<boolean | null>(() => {
    const existing = getCachedTtsCapability();
    return existing ? existing.freeformEnabled : null;
  });

  // One-shot capability probe (module-cached). Fail-closed → freeform false.
  useEffect(() => {
    const existing = getCachedTtsCapability();
    if (existing) {
      setFreeformEnabled(existing.freeformEnabled);
      return;
    }
    const ac = new AbortController();
    void loadTtsCapability(ac.signal)
      .then((cap) => {
        if (!ac.signal.aborted) {
          setFreeformEnabled(cap.freeformEnabled);
        }
      })
      .catch(() => {
        if (!ac.signal.aborted) {
          setFreeformEnabled(false);
        }
      });
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const session = sessionRef.current;
    session.cancel();
    gameAudio.stopVoice();

    // Wait for capability before any synthesize attempt (avoids 400 log spam).
    if (freeformEnabled === null) {
      return;
    }

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
        freeformEnabled,
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
    freeformEnabled,
    isSignedIn,
    language,
    lineKey,
    masterMuted,
    speaker,
    text,
    voiceEnabled,
  ]);

  const button = dialogueVoiceButtonState({ freeformEnabled });
  return {
    freeformEnabled,
    buttonDisabled: button.disabled,
    buttonVisible: button.visible,
    buttonTooltipKey: button.tooltipKey,
  };
}
