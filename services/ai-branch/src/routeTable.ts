/**
 * HTTP route table for ai-branch — one place for future AI sessions to find endpoints.
 * server.ts only loads secrets and listens.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { verifyBearerToken } from "./authGate.js";
import { characterProviderHealthSnapshot } from "./characterProviderConfig.js";
import { handleCharacterAssetRoute } from "./characterAssetService.js";
import { handleCharacterPackRoute } from "./characterRoutes.js";
import { getCommercialRouteRuntime } from "./commercialRouteRuntime.js";
import { handleEndingRoute } from "./endingRoutes.js";
import { handleSpendRoute } from "./spendRoutes.js";
import { getCountsForStory, recordChoice } from "./choiceStatsStore.js";
import { generateAiBranch, type AiBranchRequestBody } from "./handler.js";
import { hasOpenRouterKey, readBody, sendJson } from "./httpUtils.js";
import { reviewAiBranchRequest, reviewAiBranchResponse } from "./safetyGate.js";
import { listPreviewIds, resolvePreviewPhrase } from "./ttsCatalog.js";
import { synthesizeDialogue, ttsHealthSnapshot } from "./ttsRoute.js";
import {
  AI_BRANCH_COST_BATTERIES,
  TTS_COST_BATTERIES,
  commitReservation,
  getWalletBalance,
  refundReservation,
  reserveBatteries,
  settleReservation,
  walletMeterConfigured,
  walletOptionalMode,
} from "./walletMeter.js";

const commercialRuntime = getCommercialRouteRuntime();

export async function handleAiBranchRequest(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<boolean> {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return true;
  }

  if (
    url.pathname.startsWith("/ai/characters/references") ||
    url.pathname === "/internal/ai/characters/references/cleanup"
  ) {
    try {
      if (
        await handleCharacterAssetRoute(
          req,
          res,
          url,
          commercialRuntime.getCharacterAssetDependencies(),
        )
      ) {
        return true;
      }
    } catch {
      sendJson(res, 503, { error: "CHARACTER_ASSET_SERVICE_UNAVAILABLE" });
      return true;
    }
  }

  if (url.pathname.startsWith("/ai/characters/packs")) {
    try {
      if (
        await handleCharacterPackRoute(
          req,
          res,
          url,
          commercialRuntime.getCharacterPackDependencies(),
        )
      ) {
        return true;
      }
    } catch {
      sendJson(res, 503, { error: "CHARACTER_SERVICE_UNAVAILABLE" });
      return true;
    }
  }

  if (url.pathname.startsWith("/ai/endings/sessions")) {
    try {
      if (await handleEndingRoute(req, res, url, commercialRuntime.getEndingDependencies())) {
        return true;
      }
    } catch {
      sendJson(res, 503, { error: "AI_ENDING_SERVICE_UNAVAILABLE" });
      return true;
    }
  }

  if (
    await handleSpendRoute(req, res, url, {
      verifyAuth: verifyBearerToken,
      getStore: () => commercialRuntime.getSpendReceiptReader(),
    })
  ) {
    return true;
  }

  if (req.method === "GET" && (url.pathname === "/health" || url.pathname === "/")) {
    sendJson(res, 200, {
      ok: true,
      service: "supaluv-ai-branch",
      openRouterConfigured: hasOpenRouterKey(),
      model: process.env.SUPALUV_OPENROUTER_MODEL ?? "google/gemini-3.5-flash",
      thinkingLevel: process.env.SUPALUV_THINKING_LEVEL ?? "high",
      runtime: "mastra+swimmer-ai-kit",
      authRequired: true,
      sightengineConfigured: Boolean(
        process.env.SIGHTENGINE_API_USER?.trim() && process.env.SIGHTENGINE_API_SECRET?.trim(),
      ),
      characterImage: characterProviderHealthSnapshot(),
      tts: ttsHealthSnapshot(),
      wallet: {
        meterConfigured: walletMeterConfigured(),
        optionalMode: walletOptionalMode(),
        aiBranchCostBatteries: AI_BRANCH_COST_BATTERIES,
        ttsCostBatteries: TTS_COST_BATTERIES,
      },
      ttsPreviews: listPreviewIds(),
    });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/wallet/balance") {
    try {
      const auth = await verifyBearerToken(req.headers.authorization);
      if (!auth.ok) {
        sendJson(res, auth.status, { error: auth.error });
        return true;
      }
      if (!walletMeterConfigured()) {
        sendJson(res, 200, {
          batteries: null,
          available: false,
          reason: walletOptionalMode() ? "optional_unmetered" : "secret_missing",
        });
        return true;
      }
      const balance = await getWalletBalance(auth.userId);
      if (!balance) {
        sendJson(res, 200, { batteries: 0, available: true, reason: "empty_or_app_missing" });
        return true;
      }
      sendJson(res, 200, {
        batteries: balance.batteries,
        availablePowerUnits: balance.availablePowerUnits,
        reservedPowerUnits: balance.reservedPowerUnits,
        available: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "wallet failed";
      sendJson(res, 502, { error: message.slice(0, 200) });
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/tts/preview") {
    try {
      const auth = await verifyBearerToken(req.headers.authorization);
      if (!auth.ok) {
        sendJson(res, auth.status, { error: auth.error });
        return true;
      }
      const raw = await readBody(req);
      const body = JSON.parse(raw) as { previewId?: string; emotion?: string };
      const phrase = resolvePreviewPhrase(body.previewId);
      if (!phrase) {
        sendJson(res, 400, { error: "Invalid previewId", allowed: listPreviewIds() });
        return true;
      }
      const result = await synthesizeDialogue({
        text: phrase.text,
        language: phrase.language,
        characterId: phrase.characterId,
        emotion: body.emotion ?? "calm",
      });
      sendJson(res, 200, { ...result, previewId: body.previewId, billed: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "TTS failed";
      sendJson(res, 502, { error: message.slice(0, 280) });
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/tts/synthesize") {
    try {
      const auth = await verifyBearerToken(req.headers.authorization);
      if (!auth.ok) {
        sendJson(res, auth.status, { error: auth.error });
        return true;
      }
      const raw = await readBody(req);
      const body = JSON.parse(raw) as {
        text?: string;
        language?: string;
        characterId?: string;
        emotion?: string;
        previewId?: string;
      };

      const phrase = resolvePreviewPhrase(body.previewId);
      const allowFreeform = process.env.SUPALUV_TTS_ALLOW_FREEFORM === "1";
      let text = phrase?.text ?? "";
      let language = phrase?.language ?? body.language;
      let characterId = phrase?.characterId ?? body.characterId;

      if (!phrase) {
        if (!allowFreeform) {
          sendJson(res, 400, {
            error: "Free-form TTS disabled. Use previewId (zh_preview|en_preview) or /tts/preview.",
          });
          return true;
        }
        text = body.text?.trim() ?? "";
        if (!text || text.length > 500) {
          sendJson(res, 400, { error: "text required (1–500 chars)" });
          return true;
        }
      }

      let reservationId = "";
      if (TTS_COST_BATTERIES > 0) {
        const reserved = await reserveBatteries({
          userId: auth.userId,
          batteries: TTS_COST_BATTERIES,
          reason: "tts",
        });
        if (!reserved.ok) {
          sendJson(res, reserved.code === "INSUFFICIENT" ? 402 : 503, {
            error: reserved.message,
          });
          return true;
        }
        reservationId = reserved.reservationId;
      }

      try {
        const result = await synthesizeDialogue({
          text,
          language,
          characterId,
          emotion: body.emotion,
        });
        await commitReservation({ reservationId, reason: "tts" });
        sendJson(res, 200, result);
      } catch (error) {
        await refundReservation({ reservationId, reason: "tts_failed" });
        throw error;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "TTS failed";
      sendJson(res, 502, { error: message.slice(0, 280) });
    }
    return true;
  }

  if (req.method === "POST" && (url.pathname === "/ai/branch" || url.pathname === "/")) {
    let reservationId = "";
    try {
      const auth = await verifyBearerToken(req.headers.authorization);
      if (!auth.ok) {
        sendJson(res, auth.status, { error: auth.error });
        return true;
      }

      if (!hasOpenRouterKey()) {
        sendJson(res, 503, { error: "AI provider is not configured" });
        return true;
      }

      const raw = await readBody(req);
      const body = JSON.parse(raw) as AiBranchRequestBody;
      if (!body?.config?.rejoinSceneId || !body.sceneId || !body.storyId) {
        sendJson(res, 400, { error: "Invalid body: need storyId, sceneId, config.rejoinSceneId" });
        return true;
      }

      const inputSafety = await reviewAiBranchRequest(body);
      if (!inputSafety.allowed) {
        sendJson(res, 403, { error: "SAFETY_BLOCKED", reason: inputSafety.reason });
        return true;
      }

      const reserved = await reserveBatteries({
        userId: auth.userId,
        batteries: AI_BRANCH_COST_BATTERIES,
        reason: "ai_branch",
        idempotencyKey: `ai_branch:${auth.userId}:${body.storyId}:${body.sceneId}:${body.config.rejoinSceneId}`,
      });
      if (!reserved.ok) {
        sendJson(res, reserved.code === "INSUFFICIENT" ? 402 : 503, {
          error: reserved.message,
          code: reserved.code,
        });
        return true;
      }
      reservationId = reserved.reservationId;

      const result = await generateAiBranch(body, {
        apiKey: process.env.OPENROUTER_API_KEY!,
        model: process.env.SUPALUV_OPENROUTER_MODEL ?? "google/gemini-3.5-flash",
        thinkingLevel: process.env.SUPALUV_THINKING_LEVEL ?? "high",
        appName: "SupaLuv",
      });

      const outputSafety = await reviewAiBranchResponse(body, result);
      if (!outputSafety.allowed) {
        await refundReservation({ reservationId, reason: "ai_branch_safety" });
        sendJson(res, 403, { error: "SAFETY_BLOCKED", reason: outputSafety.reason });
        return true;
      }

      if (!reserved.skipped) {
        await settleReservation({
          ownerId: auth.userId,
          reservationId,
          actionKind: "ai_side_choice",
          scopeType: "story_run",
          amountPowerUnits: reserved.amountPowerUnits,
          metadata: { storyId: body.storyId, sceneId: body.sceneId },
        });
      }
      sendJson(res, 200, {
        ...result,
        provider: `${result.provider}+auth`,
        billedBatteries: reserved.skipped ? 0 : AI_BRANCH_COST_BATTERIES,
      });
    } catch (error) {
      await refundReservation({ reservationId, reason: "ai_branch_failed" });
      const message = error instanceof Error ? error.message : "AI branch failed";
      sendJson(res, 502, { error: message });
    }
    return true;
  }

  if (req.method === "GET" && url.pathname === "/choice-stats") {
    const storyId = (url.searchParams.get("storyId") ?? "ch01").trim() || "ch01";
    sendJson(res, 200, {
      storyId,
      counts: getCountsForStory(storyId),
      source: "anonymous-memory-aggregate",
    });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/choice-stats/record") {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw) as { storyId?: string; choiceId?: string };
      const choiceId = body.choiceId?.trim() ?? "";
      const storyId = body.storyId?.trim() ?? "";
      if (!choiceId || !storyId) {
        sendJson(res, 400, { error: "Need storyId and choiceId" });
        return true;
      }
      const count = recordChoice(storyId, choiceId);
      if (!count) {
        sendJson(res, 400, { error: "Invalid storyId or choiceId" });
        return true;
      }
      sendJson(res, 200, { ok: true, choiceId, count });
    } catch {
      sendJson(res, 400, { error: "Invalid JSON body" });
    }
    return true;
  }

  return false;
}
