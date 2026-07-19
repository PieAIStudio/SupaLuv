import { randomUUID, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { CharacterImageInput } from "./characterImageProvider.js";
import type { AuthGateFailure, AuthGateResult } from "../authGate.js";
import {
  CHARACTER_IMAGE_MIME_TYPES,
  MAX_CHARACTER_REFERENCE_BYTES,
  MAX_CHARACTER_REFERENCES,
} from "./characterSchemas.js";
import { readBody, RequestBodyTooLargeError, sendJson } from "../httpUtils.js";
import type { CharacterGenerationStore } from "../persistence/characterGenerationStore.js";
import type { ReferenceAssetRecord } from "../persistence/index.js";

export const CHARACTER_ASSET_BUCKET = "supaluv-character-assets";
export const CHARACTER_ASSET_BODY_LIMIT_BYTES = 64 * 1024;
export const CHARACTER_REFERENCE_RETENTION_DAYS = 180;

const stableId = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);

const uploadRequestSchema = z
  .object({
    packId: stableId,
    clientReferenceId: stableId,
    mimeType: z.enum(CHARACTER_IMAGE_MIME_TYPES),
    sizeBytes: z.number().int().positive().max(MAX_CHARACTER_REFERENCE_BYTES),
  })
  .strict();

const finalizeRequestSchema = z
  .object({
    assetId: z.string().uuid(),
    packId: stableId,
    storagePath: z.string().trim().min(1).max(512),
    mimeType: z.enum(CHARACTER_IMAGE_MIME_TYPES),
    sizeBytes: z.number().int().positive().max(MAX_CHARACTER_REFERENCE_BYTES),
  })
  .strict();

export class CharacterAssetNotFoundError extends Error {
  constructor() {
    super("Character reference not found");
    this.name = "CharacterAssetNotFoundError";
  }
}

export class CharacterReferenceLimitError extends Error {
  constructor() {
    super(`A character can use at most ${MAX_CHARACTER_REFERENCES} reference images`);
    this.name = "CharacterReferenceLimitError";
  }
}

export class CharacterAssetStorageError extends Error {
  constructor(message = "Character reference storage is unavailable") {
    super(message);
    this.name = "CharacterAssetStorageError";
  }
}

export type SignedCharacterUpload = {
  readonly signedUrl: string;
  readonly token: string;
};

export type CharacterStoredFile = {
  readonly mimeType: string;
  readonly sizeBytes: number;
};

export interface CharacterAssetStorage {
  createSignedUpload(storagePath: string): Promise<SignedCharacterUpload>;
  inspect(storagePath: string): Promise<CharacterStoredFile | null>;
  remove(storagePaths: readonly string[]): Promise<void>;
}

export interface CharacterAssetBinaryStorage extends CharacterAssetStorage {
  download(storagePath: string): Promise<CharacterImageInput>;
  uploadGenerated(storagePath: string, image: CharacterImageInput): Promise<void>;
  createSignedDownload(storagePath: string, expiresInSeconds?: number): Promise<string>;
}

export interface CharacterAssetService {
  createUpload(
    ownerId: string,
    input: z.infer<typeof uploadRequestSchema>,
  ): Promise<{
    readonly assetId: string;
    readonly storagePath: string;
    readonly signedUrl: string;
    readonly token: string;
    readonly expiresAt: string;
  }>;
  finalizeUpload(
    ownerId: string,
    input: z.infer<typeof finalizeRequestSchema>,
  ): Promise<ReferenceAssetRecord>;
  listReferences(ownerId: string, packId: string): Promise<readonly ReferenceAssetRecord[]>;
  deleteReference(ownerId: string, assetId: string): Promise<{ readonly deleted: boolean }>;
  cleanupExpired(beforeIso?: string, limit?: number): Promise<{ readonly deleted: number }>;
}

const extensionForMime: Readonly<Record<(typeof CHARACTER_IMAGE_MIME_TYPES)[number], string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

function expiryFrom(now: Date): string {
  return new Date(
    now.getTime() + CHARACTER_REFERENCE_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}

function expectedStoragePath(
  ownerId: string,
  packId: string,
  assetId: string,
  mimeType: (typeof CHARACTER_IMAGE_MIME_TYPES)[number],
): string {
  return `${ownerId}/${packId}/references/${assetId}.${extensionForMime[mimeType]}`;
}

export function createCharacterAssetService(options: {
  readonly store: CharacterGenerationStore;
  readonly storage: CharacterAssetStorage;
  readonly now?: () => Date;
}): CharacterAssetService {
  const now = options.now ?? (() => new Date());

  return {
    async createUpload(ownerId, input) {
      const pack = await options.store.getCharacterPack(ownerId, input.packId);
      if (!pack) throw new CharacterAssetNotFoundError();
      const references = await options.store.listReferenceAssets(ownerId, input.packId);
      if (references.length >= MAX_CHARACTER_REFERENCES) throw new CharacterReferenceLimitError();

      const assetId = randomUUID();
      const storagePath = expectedStoragePath(ownerId, input.packId, assetId, input.mimeType);
      const signed = await options.storage.createSignedUpload(storagePath);
      return {
        assetId,
        storagePath,
        ...signed,
        expiresAt: expiryFrom(now()),
      };
    },

    async finalizeUpload(ownerId, input) {
      const pack = await options.store.getCharacterPack(ownerId, input.packId);
      if (!pack) throw new CharacterAssetNotFoundError();
      const expectedPath = expectedStoragePath(
        ownerId,
        input.packId,
        input.assetId,
        input.mimeType,
      );
      if (input.storagePath !== expectedPath) throw new CharacterAssetNotFoundError();

      const existing = await options.store.getReferenceAsset(ownerId, input.assetId);
      if (existing) return existing;
      const references = await options.store.listReferenceAssets(ownerId, input.packId);
      if (references.length >= MAX_CHARACTER_REFERENCES) throw new CharacterReferenceLimitError();

      const stored = await options.storage.inspect(input.storagePath);
      if (!stored) throw new CharacterAssetNotFoundError();
      if (stored.mimeType !== input.mimeType || stored.sizeBytes !== input.sizeBytes) {
        await options.storage.remove([input.storagePath]);
        throw new CharacterAssetStorageError("Uploaded file does not match its declaration");
      }
      if (
        !CHARACTER_IMAGE_MIME_TYPES.includes(
          stored.mimeType as (typeof CHARACTER_IMAGE_MIME_TYPES)[number],
        ) ||
        stored.sizeBytes <= 0 ||
        stored.sizeBytes > MAX_CHARACTER_REFERENCE_BYTES
      ) {
        await options.storage.remove([input.storagePath]);
        throw new CharacterAssetStorageError("Uploaded file type or size is not allowed");
      }

      return options.store.saveReferenceAsset({
        id: input.assetId,
        ownerId,
        packId: input.packId,
        referenceIndex: references.length,
        storageBucket: CHARACTER_ASSET_BUCKET,
        storagePath: input.storagePath,
        mimeType: input.mimeType,
        expiresAt: expiryFrom(now()),
      });
    },

    async listReferences(ownerId, packId) {
      const pack = await options.store.getCharacterPack(ownerId, packId);
      if (!pack) throw new CharacterAssetNotFoundError();
      return options.store.listReferenceAssets(ownerId, packId);
    },

    async deleteReference(ownerId, assetId) {
      const object = await options.store.deleteReferenceAsset(ownerId, assetId);
      if (!object) return { deleted: false };
      await options.storage.remove([object.storagePath]);
      return { deleted: true };
    },

    async cleanupExpired(beforeIso = now().toISOString(), limit = 100) {
      const objects = await options.store.expireReferenceAssets(beforeIso, Math.min(limit, 500));
      if (objects.length > 0) await options.storage.remove(objects.map((item) => item.storagePath));
      return { deleted: objects.length };
    },
  };
}

export function createSupabaseCharacterAssetStorage(
  client: SupabaseClient,
): CharacterAssetBinaryStorage {
  const bucket = client.storage.from(CHARACTER_ASSET_BUCKET);
  return {
    async createSignedUpload(storagePath) {
      const { data, error } = await bucket.createSignedUploadUrl(storagePath);
      if (error || !data) throw new CharacterAssetStorageError(error?.message);
      return { signedUrl: data.signedUrl, token: data.token };
    },
    async inspect(storagePath) {
      const slash = storagePath.lastIndexOf("/");
      const directory = storagePath.slice(0, slash);
      const filename = storagePath.slice(slash + 1);
      const { data, error } = await bucket.list(directory, { limit: 2, search: filename });
      if (error) throw new CharacterAssetStorageError(error.message);
      const file = data?.find((candidate) => candidate.name === filename);
      if (!file) return null;
      const metadata = file.metadata as { mimetype?: unknown; size?: unknown } | null;
      return {
        mimeType: String(metadata?.mimetype ?? ""),
        sizeBytes: Number(metadata?.size ?? 0),
      };
    },
    async remove(storagePaths) {
      if (storagePaths.length === 0) return;
      const { error } = await bucket.remove([...storagePaths]);
      if (error) throw new CharacterAssetStorageError(error.message);
    },
    async download(storagePath) {
      const { data, error } = await bucket.download(storagePath);
      if (error || !data) throw new CharacterAssetStorageError(error?.message);
      const mimeType = data.type;
      if (
        !CHARACTER_IMAGE_MIME_TYPES.includes(
          mimeType as (typeof CHARACTER_IMAGE_MIME_TYPES)[number],
        )
      ) {
        throw new CharacterAssetStorageError("Stored image has an unsupported MIME type");
      }
      return {
        bytes: new Uint8Array(await data.arrayBuffer()),
        mimeType: mimeType as CharacterImageInput["mimeType"],
      };
    },
    async uploadGenerated(storagePath, image) {
      const { error } = await bucket.upload(storagePath, image.bytes, {
        contentType: image.mimeType,
        upsert: false,
      });
      if (error) throw new CharacterAssetStorageError(error.message);
    },
    async createSignedDownload(storagePath, expiresInSeconds = 60 * 60) {
      const { data, error } = await bucket.createSignedUrl(storagePath, expiresInSeconds);
      if (error || !data?.signedUrl) throw new CharacterAssetStorageError(error?.message);
      return data.signedUrl;
    },
  };
}

type VerifyAuth = (
  authorizationHeader: string | undefined,
) => Promise<AuthGateResult | AuthGateFailure>;

export type CharacterAssetRouteDependencies = {
  readonly verifyAuth: VerifyAuth;
  readonly assets: CharacterAssetService;
  readonly cleanupSecret?: string;
};

function secureSecretMatches(expected: string | undefined, actual: string | undefined): boolean {
  if (!expected || !actual) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(actual);
  return left.length === right.length && timingSafeEqual(left, right);
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new SyntaxError("Invalid JSON body");
  }
}

function sendsPayloadTooLarge(input: unknown): boolean {
  if (!input || typeof input !== "object") return false;
  const size = (input as { sizeBytes?: unknown }).sizeBytes;
  return typeof size === "number" && size > MAX_CHARACTER_REFERENCE_BYTES;
}

export async function handleCharacterAssetRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  dependencies: CharacterAssetRouteDependencies,
): Promise<boolean> {
  const isPlayerRoute = url.pathname.startsWith("/ai/characters/references");
  const isCleanupRoute = url.pathname === "/internal/ai/characters/references/cleanup";
  if (!isPlayerRoute && !isCleanupRoute) return false;

  try {
    if (isCleanupRoute) {
      if (req.method !== "POST") return false;
      const provided = req.headers["x-supaluv-cleanup-secret"];
      const actual = Array.isArray(provided) ? provided[0] : provided;
      if (!secureSecretMatches(dependencies.cleanupSecret, actual)) {
        sendJson(res, 401, { error: "Unauthorized cleanup request" });
        return true;
      }
      sendJson(res, 200, await dependencies.assets.cleanupExpired());
      return true;
    }

    const auth = await dependencies.verifyAuth(req.headers.authorization);
    if (!auth.ok) {
      sendJson(res, auth.status, { error: auth.error });
      return true;
    }

    if (req.method === "POST" && url.pathname === "/ai/characters/references/uploads") {
      const raw = await readBody(req, CHARACTER_ASSET_BODY_LIMIT_BYTES);
      const input = parseJson(raw);
      if (sendsPayloadTooLarge(input)) {
        sendJson(res, 413, { error: "Reference image exceeds 10 MiB" });
        return true;
      }
      const parsed = uploadRequestSchema.safeParse(input);
      if (!parsed.success) {
        sendJson(res, 422, { error: "Invalid upload request", issues: parsed.error.issues });
        return true;
      }
      sendJson(res, 201, await dependencies.assets.createUpload(auth.userId, parsed.data));
      return true;
    }

    if (req.method === "POST" && url.pathname === "/ai/characters/references/finalize") {
      const raw = await readBody(req, CHARACTER_ASSET_BODY_LIMIT_BYTES);
      const input = parseJson(raw);
      if (sendsPayloadTooLarge(input)) {
        sendJson(res, 413, { error: "Reference image exceeds 10 MiB" });
        return true;
      }
      const parsed = finalizeRequestSchema.safeParse(input);
      if (!parsed.success) {
        sendJson(res, 422, { error: "Invalid finalize request", issues: parsed.error.issues });
        return true;
      }
      sendJson(res, 200, await dependencies.assets.finalizeUpload(auth.userId, parsed.data));
      return true;
    }

    if (req.method === "GET" && url.pathname === "/ai/characters/references") {
      const packId = url.searchParams.get("packId") ?? "";
      const parsed = stableId.safeParse(packId);
      if (!parsed.success) {
        sendJson(res, 422, { error: "A valid packId is required" });
        return true;
      }
      sendJson(res, 200, {
        references: await dependencies.assets.listReferences(auth.userId, parsed.data),
      });
      return true;
    }

    const deleteMatch = /^\/ai\/characters\/references\/([^/]+)$/.exec(url.pathname);
    if (req.method === "DELETE" && deleteMatch) {
      const assetId = deleteMatch[1];
      if (!assetId) return false;
      sendJson(
        res,
        200,
        await dependencies.assets.deleteReference(auth.userId, decodeURIComponent(assetId)),
      );
      return true;
    }

    return false;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      sendJson(res, 413, { error: error.message });
    } else if (error instanceof CharacterAssetNotFoundError) {
      sendJson(res, 404, { error: error.message });
    } else if (error instanceof CharacterReferenceLimitError) {
      sendJson(res, 409, { error: error.message });
    } else if (error instanceof SyntaxError) {
      sendJson(res, 400, { error: error.message });
    } else if (error instanceof CharacterAssetStorageError) {
      sendJson(res, 502, { error: error.message });
    } else {
      const message = error instanceof Error ? error.message : "Character asset request failed";
      sendJson(res, 500, { error: message.slice(0, 200) });
    }
    return true;
  }
}
