import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createClient } from "@supabase/supabase-js";
import {
  ADULT_COMEDY_MODERATION_POLICY,
  createContentModerationProvider,
} from "@pieai/swimmer-ai-kit/content-safety";
import { z } from "zod";
import type { AuthGateFailure, AuthGateResult } from "./authGate.js";
import { verifyBearerToken } from "./authGate.js";
import {
  CharacterAssetStorageError,
  CHARACTER_ASSET_BODY_LIMIT_BYTES,
  createSupabaseCharacterAssetStorage,
} from "./characterAssetService.js";
import { CharacterImageProviderError } from "./characterImageProvider.js";
import { createConfiguredGeminiCharacterImageProvider } from "./geminiCharacterImageProvider.js";
import {
  CharacterGenerationBusyError,
  CharacterGenerationPaymentError,
  createCharacterGenerationService,
  type CharacterGenerationService,
} from "./characterGenerationService.js";
import { CharacterSafetyError } from "./characterSafety.js";
import {
  createCharacterSafety,
  createConfiguredGeminiAdultPresentationReviewer,
} from "./characterSafety.js";
import { readBody, RequestBodyTooLargeError, sendJson } from "./httpUtils.js";
import { createSupabaseSupaluvStore, type SupaluvStore } from "./supaluvStore.js";
import { commitReservation, refundReservation, reserveBatteries } from "./walletMeter.js";

const stableId = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const createPackSchema = z
  .object({
    clientPackId: stableId,
    slotId: stableId,
    brief: z.string().trim().min(1).max(2_000),
  })
  .strict();
const generationSchema = z
  .object({
    clientActionId: stableId,
    kind: z.enum(["human", "robot"]),
    prompt: z.string().trim().min(1).max(4_000),
  })
  .strict();

type VerifyAuth = (
  authorizationHeader: string | undefined,
) => Promise<AuthGateResult | AuthGateFailure>;

export type CharacterPackRouteDependencies = {
  readonly verifyAuth: VerifyAuth;
  readonly store: SupaluvStore;
  readonly generation: CharacterGenerationService;
  readonly signAsset?: (storagePath: string) => Promise<string>;
};

async function presentAsset(
  asset: Awaited<ReturnType<SupaluvStore["listGeneratedAssets"]>>[number],
  signAsset?: (storagePath: string) => Promise<string>,
) {
  return { ...asset, ...(signAsset ? { url: await signAsset(asset.storagePath) } : {}) };
}

async function body(req: IncomingMessage): Promise<unknown> {
  const raw = await readBody(req, CHARACTER_ASSET_BODY_LIMIT_BYTES);
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new SyntaxError("Invalid JSON body");
  }
}

export async function handleCharacterPackRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  dependencies: CharacterPackRouteDependencies,
): Promise<boolean> {
  if (!url.pathname.startsWith("/ai/characters/packs")) return false;
  try {
    const auth = await dependencies.verifyAuth(req.headers.authorization);
    if (!auth.ok) {
      sendJson(res, auth.status, { error: auth.error });
      return true;
    }

    if (url.pathname === "/ai/characters/packs" && req.method === "POST") {
      const parsed = createPackSchema.safeParse(await body(req));
      if (!parsed.success) {
        sendJson(res, 422, { error: "Invalid character pack", issues: parsed.error.issues });
        return true;
      }
      const pack = await dependencies.store.saveCharacterPack({
        id: randomUUID(),
        ownerId: auth.userId,
        clientPackId: parsed.data.clientPackId,
        slotId: parsed.data.slotId,
        status: "draft",
        brief: { text: parsed.data.brief },
      });
      sendJson(res, 201, pack);
      return true;
    }

    if (url.pathname === "/ai/characters/packs" && req.method === "GET") {
      const slotId = url.searchParams.get("slotId") ?? undefined;
      sendJson(res, 200, {
        packs: await dependencies.store.listCharacterPacks(auth.userId, slotId),
      });
      return true;
    }

    const match = /^\/ai\/characters\/packs\/([^/]+)(?:\/(.*))?$/.exec(url.pathname);
    const packId = match?.[1] ? decodeURIComponent(match[1]) : undefined;
    const operation = match?.[2] ?? "";
    if (!packId) return false;

    if (req.method === "DELETE" && !operation) {
      sendJson(res, 200, await dependencies.generation.deletePack(auth.userId, packId));
      return true;
    }
    if (req.method === "GET" && !operation) {
      const pack = await dependencies.store.getCharacterPack(auth.userId, packId);
      if (!pack) {
        sendJson(res, 404, { error: "CHARACTER_PACK_NOT_FOUND" });
        return true;
      }
      const assets = await dependencies.store.listGeneratedAssets(auth.userId, packId);
      sendJson(res, 200, {
        pack,
        assets: await Promise.all(
          assets.map((asset) => presentAsset(asset, dependencies.signAsset)),
        ),
      });
      return true;
    }
    if (req.method === "POST" && operation === "base/accept") {
      await dependencies.generation.acceptBase(auth.userId, packId);
      sendJson(res, 200, { accepted: true });
      return true;
    }
    if (
      req.method === "POST" &&
      (operation === "base" || operation === "moods" || operation.startsWith("moods/"))
    ) {
      const parsed = generationSchema.safeParse(await body(req));
      if (!parsed.success) {
        sendJson(res, 422, { error: "Invalid generation request", issues: parsed.error.issues });
        return true;
      }
      if (operation === "base") {
        const result = await dependencies.generation.generateBase({
          ownerId: auth.userId,
          packId,
          ...parsed.data,
        });
        sendJson(res, 200, {
          ...result,
          asset: await presentAsset(result.asset, dependencies.signAsset),
        });
      } else if (operation === "moods") {
        const assets = await dependencies.generation.generateMoodPack({
          ownerId: auth.userId,
          packId,
          ...parsed.data,
        });
        sendJson(res, 200, {
          assets: await Promise.all(
            assets.map((asset) => presentAsset(asset, dependencies.signAsset)),
          ),
        });
      } else {
        const mood = decodeURIComponent(operation.slice("moods/".length));
        const result = await dependencies.generation.generateMood({
          ownerId: auth.userId,
          packId,
          mood,
          ...parsed.data,
        });
        sendJson(res, 200, {
          ...result,
          asset: await presentAsset(result.asset, dependencies.signAsset),
        });
      }
      return true;
    }
    return false;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      sendJson(res, 413, { error: error.message });
    } else if (error instanceof SyntaxError || error instanceof z.ZodError) {
      sendJson(res, 422, { error: "Invalid request" });
    } else if (error instanceof CharacterGenerationBusyError) {
      sendJson(res, 409, { error: "CHARACTER_GENERATION_BUSY" });
    } else if (error instanceof CharacterGenerationPaymentError) {
      sendJson(res, error.code === "INSUFFICIENT" ? 402 : 503, { error: error.code });
    } else if (error instanceof CharacterSafetyError) {
      sendJson(res, error.retryable ? 503 : 403, { error: error.code, message: error.message });
    } else if (error instanceof CharacterImageProviderError) {
      sendJson(res, error.retryable ? 503 : 422, { error: error.code });
    } else if (error instanceof CharacterAssetStorageError) {
      sendJson(res, 503, { error: "CHARACTER_STORAGE_UNAVAILABLE" });
    } else {
      const message = error instanceof Error ? error.message : "Character pack request failed";
      sendJson(res, 500, { error: message.slice(0, 200) });
    }
    return true;
  }
}

let configured: CharacterPackRouteDependencies | undefined;

export function getConfiguredCharacterPackDependencies(): CharacterPackRouteDependencies {
  if (configured) return configured;
  const url = process.env.SWIMMER_CORE_SUPABASE_URL?.trim();
  const key = process.env.SWIMMER_CORE_SECRET_KEY?.trim();
  if (!url || !key) throw new Error("SupaLuv character database credentials are required");
  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const store = createSupabaseSupaluvStore(client);
  const storage = createSupabaseCharacterAssetStorage(client);
  const moderation = createContentModerationProvider({
    policy: ADULT_COMEDY_MODERATION_POLICY,
    sightengineApiUser: process.env.SIGHTENGINE_API_USER,
    sightengineApiSecret: process.env.SIGHTENGINE_API_SECRET,
  });
  configured = {
    verifyAuth: verifyBearerToken,
    store,
    generation: createCharacterGenerationService({
      store,
      storage,
      provider: createConfiguredGeminiCharacterImageProvider(),
      safety: createCharacterSafety({
        moderation,
        semanticReviewer: createConfiguredGeminiAdultPresentationReviewer(),
      }),
      wallet: {
        reserve: (input) =>
          reserveBatteries({
            userId: input.ownerId,
            batteries: input.batteries,
            reason: input.reason,
            idempotencyKey: input.idempotencyKey,
          }),
        commit: (reservationId, reason) => commitReservation({ reservationId, reason }),
        refund: (reservationId, reason) => refundReservation({ reservationId, reason }),
      },
      baseCostBatteries: Number(process.env.SUPALUV_CHARACTER_BASE_COST_BATTERIES ?? "1"),
      moodCostBatteries: Number(process.env.SUPALUV_CHARACTER_MOOD_COST_BATTERIES ?? "1"),
    }),
    signAsset: (storagePath) => storage.createSignedDownload(storagePath),
  };
  return configured;
}
