import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CharacterAssetNotFoundError,
  createCharacterAssetService,
  handleCharacterAssetRoute,
  type CharacterAssetStorage,
  type CharacterAssetRouteDependencies,
} from "../../services/ai-branch/src/characterAssetService";
import { createInMemoryPersistenceModules } from "../../services/ai-branch/src/persistence/index";

let server: Server | undefined;

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) =>
      server?.close((error) => (error ? reject(error) : resolve())),
    );
    server = undefined;
  }
});

function dependencies(): CharacterAssetRouteDependencies {
  return {
    verifyAuth: vi.fn(async (authorization) =>
      authorization === "Bearer valid"
        ? { ok: true as const, userId: "owner-a", isAnonymous: false }
        : { ok: false as const, status: 401 as const, error: "Missing authorization" },
    ),
    assets: {
      createUpload: vi.fn(async () => ({
        assetId: "asset-1",
        storagePath: "owner-a/pack-1/references/ref-1.jpg",
        signedUrl: "https://upload.invalid/signed",
        token: "upload-token",
        expiresAt: "2027-01-08T00:00:00.000Z",
      })),
      finalizeUpload: vi.fn(async () => ({
        id: "asset-1",
        ownerId: "owner-a",
        packId: "pack-1",
        referenceIndex: 0,
        storageBucket: "supaluv-character-assets",
        storagePath: "owner-a/pack-1/references/asset-1.jpg",
        mimeType: "image/jpeg",
        expiresAt: "2027-01-08T00:00:00.000Z",
      })),
      listReferences: vi.fn(async () => []),
      deleteReference: vi.fn(async () => ({ deleted: true })),
      cleanupExpired: vi.fn(async () => ({ deleted: 0 })),
    },
    cleanupSecret: "cleanup-secret",
  };
}

async function request(
  deps: CharacterAssetRouteDependencies,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  server = createServer(async (req, res) => {
    const handled = await handleCharacterAssetRoute(
      req,
      res,
      new URL(req.url ?? "/", "http://127.0.0.1"),
      deps,
    );
    if (!handled) {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server missing port");
  return fetch(`http://127.0.0.1:${address.port}${path}`, init);
}

describe("character reference routes", () => {
  it("requires authentication before creating an upload", async () => {
    const response = await request(dependencies(), "/ai/characters/references/uploads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(401);
  });

  it("rejects unsupported MIME types and oversized files", async () => {
    const deps = dependencies();
    const invalidMime = await request(deps, "/ai/characters/references/uploads", {
      method: "POST",
      headers: { authorization: "Bearer valid", "content-type": "application/json" },
      body: JSON.stringify({
        packId: "pack-1",
        clientReferenceId: "ref-1",
        mimeType: "image/svg+xml",
        sizeBytes: 100,
      }),
    });
    expect(invalidMime.status).toBe(422);
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    server = undefined;

    const oversized = await request(deps, "/ai/characters/references/uploads", {
      method: "POST",
      headers: { authorization: "Bearer valid", "content-type": "application/json" },
      body: JSON.stringify({
        packId: "pack-1",
        clientReferenceId: "ref-1",
        mimeType: "image/jpeg",
        sizeBytes: 10 * 1024 * 1024 + 1,
      }),
    });
    expect(oversized.status).toBe(413);
  });

  it("does not reveal or delete another owner's asset", async () => {
    const deps = dependencies();
    vi.mocked(deps.assets.deleteReference).mockRejectedValueOnce(new CharacterAssetNotFoundError());

    const response = await request(deps, "/ai/characters/references/asset-from-owner-b", {
      method: "DELETE",
      headers: { authorization: "Bearer valid" },
    });

    expect(response.status).toBe(404);
    expect(deps.assets.deleteReference).toHaveBeenCalledWith("owner-a", "asset-from-owner-b");
  });

  it("treats a repeated owner delete as idempotent", async () => {
    const deps = dependencies();
    vi.mocked(deps.assets.deleteReference).mockResolvedValueOnce({ deleted: false });

    const response = await request(deps, "/ai/characters/references/asset-1", {
      method: "DELETE",
      headers: { authorization: "Bearer valid" },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ deleted: false });
  });

  it("rejects an oversized JSON body before parsing it", async () => {
    const response = await request(dependencies(), "/ai/characters/references/uploads", {
      method: "POST",
      headers: { authorization: "Bearer valid", "content-type": "application/json" },
      body: JSON.stringify({ padding: "x".repeat(80_000) }),
    });

    expect(response.status).toBe(413);
  });
});

describe("character reference lifecycle", () => {
  it("derives the private path from the authenticated owner and expires originals after 180 days", async () => {
    const store = createInMemoryPersistenceModules().characterGeneration;
    await store.saveCharacterPack({
      id: "pack-1",
      ownerId: "owner-a",
      clientPackId: "client-pack-1",
      slotId: "lead_suming",
      status: "draft",
      brief: {},
    });
    const files = new Map<string, { mimeType: string; sizeBytes: number }>();
    const storage: CharacterAssetStorage = {
      createSignedUpload: vi.fn(async (path: string) => ({
        signedUrl: `https://upload.invalid/${path}`,
        token: "signed-token",
      })),
      inspect: vi.fn(async (path: string) => files.get(path) ?? null),
      remove: vi.fn(async (paths: readonly string[]) => {
        paths.forEach((path: string) => files.delete(path));
      }),
    };
    const now = new Date("2026-01-12T00:00:00.000Z");
    const service = createCharacterAssetService({ store, storage, now: () => now });

    const upload = await service.createUpload("owner-a", {
      packId: "pack-1",
      clientReferenceId: "browser-id-does-not-control-the-path",
      mimeType: "image/jpeg",
      sizeBytes: 1234,
    });

    expect(upload.storagePath).toMatch(/^owner-a\/pack-1\/references\/[0-9a-f-]+\.jpg$/);
    expect(upload.expiresAt).toBe("2026-07-11T00:00:00.000Z");
    files.set(upload.storagePath, { mimeType: "image/jpeg", sizeBytes: 1234 });
    const finalized = await service.finalizeUpload("owner-a", {
      assetId: upload.assetId,
      packId: "pack-1",
      storagePath: upload.storagePath,
      mimeType: "image/jpeg",
      sizeBytes: 1234,
    });

    expect(finalized).toMatchObject({ ownerId: "owner-a", referenceIndex: 0 });
    await expect(service.listReferences("owner-b", "pack-1")).rejects.toBeInstanceOf(
      CharacterAssetNotFoundError,
    );
  });

  it("deletes expired database rows and their private storage objects", async () => {
    const store = createInMemoryPersistenceModules().characterGeneration;
    await store.saveCharacterPack({
      id: "pack-1",
      ownerId: "owner-a",
      clientPackId: "client-pack-1",
      slotId: "lead_suming",
      status: "draft",
      brief: {},
    });
    await store.saveReferenceAsset({
      id: "asset-1",
      ownerId: "owner-a",
      packId: "pack-1",
      referenceIndex: 0,
      storageBucket: "supaluv-character-assets",
      storagePath: "owner-a/pack-1/references/asset-1.jpg",
      mimeType: "image/jpeg",
      expiresAt: "2026-01-01T00:00:00.000Z",
    });
    const storage: CharacterAssetStorage = {
      createSignedUpload: vi.fn(),
      inspect: vi.fn(),
      remove: vi.fn(async () => undefined),
    };
    const service = createCharacterAssetService({ store, storage });

    await expect(service.cleanupExpired("2026-01-02T00:00:00.000Z")).resolves.toEqual({
      deleted: 1,
    });
    expect(storage.remove).toHaveBeenCalledWith(["owner-a/pack-1/references/asset-1.jpg"]);
    await expect(store.getReferenceAsset("owner-a", "asset-1")).resolves.toBeNull();
  });
});
