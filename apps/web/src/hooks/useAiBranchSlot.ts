import { useEffect, useRef, useState } from "react";
import { getAiBranchProvider } from "../ai/aiBranchProvider";
import type { AiBranchResult, AiChoiceSlotState } from "../ai/aiBranchTypes";
import { trackEvent } from "../analytics/productAnalytics";
import { getAiBatteryPitch, getAiBatteryPitchOneLiner } from "../commerce/aiBatteryPitch";
import type { AiBranchSceneConfig } from "@supaluv/shared";

interface UseAiBranchSlotOptions {
  readonly enabled: boolean;
  /** When false, AI slot shows needs_auth instead of calling the edge. */
  readonly isSignedIn: boolean;
  readonly accessToken: string | null;
  /**
   * Soft wallet read. When a finite balance is known and ≤ 0, AI is blocked
   * (ADR-0003: no free AI quota). When null (RPC unavailable), local/dev may
   * still call the edge so the framework can be exercised — UI still shows the
   * cost pitch on auth/battery gates.
   */
  readonly batteries: number | null;
  readonly storyId: string;
  readonly sceneId: string | null;
  readonly config: AiBranchSceneConfig | undefined;
  readonly authoredChoiceLabels: readonly string[];
  readonly meters: { mianzi: number; ai_score: number };
  readonly locale?: string;
}

/**
 * One AI generation per scene identity (requestKey).
 * Requires a SwimmerBackend session — no silent mock bypass for unauthenticated players.
 * No free AI quota when battery balance is known and empty.
 */
export function useAiBranchSlot({
  enabled,
  isSignedIn,
  accessToken,
  batteries,
  storyId,
  sceneId,
  config,
  authoredChoiceLabels,
  meters,
  locale = "zh-CN",
}: UseAiBranchSlotOptions): {
  slot: AiChoiceSlotState;
  beginPlaying: (result: AiBranchResult) => void;
  advanceBeat: () => { done: boolean; rejoinSceneId: string } | null;
  cancel: () => void;
} {
  const [slot, setSlot] = useState<AiChoiceSlotState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const latestRef = useRef({ authoredChoiceLabels, meters, config, accessToken, batteries });
  latestRef.current = { authoredChoiceLabels, meters, config, accessToken, batteries };

  const requestKey = `${storyId}:${sceneId ?? ""}:${config?.rejoinSceneId ?? ""}:${config?.enabled ? "1" : "0"}:${isSignedIn ? "1" : "0"}:${batteries ?? "na"}`;

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    const cfg = latestRef.current.config;
    if (!enabled || !cfg?.enabled || !sceneId) {
      setSlot({ status: "idle" });
      return;
    }

    const pitch = getAiBatteryPitch(locale);
    const oneLiner = getAiBatteryPitchOneLiner(locale);

    if (!isSignedIn) {
      setSlot({
        status: "needs_auth",
        message: oneLiner,
        pitch: pitch.body,
      });
      return;
    }

    const balance = latestRef.current.batteries;
    // ADR-0003: no free AI quota. Block when balance is 0 or still unknown
    // (wallet soft-read failed). Local unmetered override for framework work only.
    const allowUnmetered =
      import.meta.env.VITE_SUPALUV_AI_FORCE_MOCK === "1" ||
      import.meta.env.VITE_SUPALUV_AI_ALLOW_UNMETERED === "1";
    if (!allowUnmetered && (balance === null || balance <= 0)) {
      setSlot({
        status: "needs_battery",
        message: pitch.title,
        pitch: pitch.body,
      });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const waitLabel = locale.startsWith("en")
      ? "Inspiration loading…"
      : (cfg.waitLabel ?? "灵感生成中…");
    setSlot({ status: "loading", waitLabel });

    trackEvent({ name: "ai_branch_requested", storyId, sceneId });
    const provider = getAiBranchProvider();
    const {
      authoredChoiceLabels: labels,
      meters: meterSnap,
      accessToken: token,
    } = latestRef.current;

    void provider
      .generate({
        storyId,
        sceneId,
        config: cfg,
        authoredChoiceLabels: labels,
        meters: meterSnap,
        locale,
        accessToken: token,
        signal: controller.signal,
      })
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }
        trackEvent({
          name: "ai_branch_ready",
          storyId,
          sceneId,
          provider: result.provider,
        });
        setSlot({
          status: "ready",
          result: { ...result, rejoinSceneId: cfg.rejoinSceneId },
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        const message = error instanceof Error ? error.message : "灵感失败";
        if (message === "AUTH_REQUIRED") {
          setSlot({
            status: "needs_auth",
            message: "登录已失效，请重新登录后再用 AI 灵感",
            pitch: pitch.body,
          });
          return;
        }
        if (
          message === "INSUFFICIENT_BATTERIES" ||
          message.includes("INSUFFICIENT") ||
          message.includes("402")
        ) {
          setSlot({
            status: "needs_battery",
            message: pitch.title,
            pitch: pitch.body,
          });
          return;
        }
        trackEvent({
          name: "ai_branch_failed",
          storyId,
          sceneId,
          errorCode: message.slice(0, 48),
        });
        setSlot({
          status: "error",
          message: message === "SAFETY_BLOCKED" ? "内容未通过安全检测" : message.slice(0, 120),
        });
      });

    return () => {
      controller.abort();
    };
  }, [enabled, isSignedIn, locale, requestKey, sceneId, storyId]);

  function beginPlaying(result: AiBranchResult): void {
    setSlot({ status: "playing", result, beatIndex: 0 });
  }

  function advanceBeat(): { done: boolean; rejoinSceneId: string } | null {
    if (slot.status !== "playing") {
      return null;
    }
    const nextIndex = slot.beatIndex + 1;
    if (nextIndex >= slot.result.beats.length) {
      return { done: true, rejoinSceneId: slot.result.rejoinSceneId };
    }
    setSlot({ status: "playing", result: slot.result, beatIndex: nextIndex });
    return { done: false, rejoinSceneId: slot.result.rejoinSceneId };
  }

  function cancel(): void {
    abortRef.current?.abort();
    setSlot({ status: "idle" });
  }

  return { slot, beginPlaying, advanceBeat, cancel };
}
