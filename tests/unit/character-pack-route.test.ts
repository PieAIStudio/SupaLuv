import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  handleCharacterPackRoute,
  type CharacterPackRouteDependencies,
} from "../../services/ai-branch/src/characterRoutes";
import {
  CharacterGenerationBusyError,
  CharacterGenerationPaymentError,
} from "../../services/ai-branch/src/characterGenerationService";
import { createInMemorySupaluvStore } from "../../services/ai-branch/src/supaluvStore";

let server: Server | undefined;
afterEach(async () => {
  if (server) await new Promise<void>((resolve) => server?.close(() => resolve()));
  server = undefined;
});

function deps(): CharacterPackRouteDependencies {
  return {
    verifyAuth: vi.fn(async (authorization) =>
      authorization === "Bearer valid"
        ? { ok: true as const, userId: "owner-a", isAnonymous: false }
        : { ok: false as const, status: 401 as const, error: "Missing authorization" },
    ),
    store: createInMemorySupaluvStore(),
    generation: {
      generateBase: vi.fn(async () => ({ asset: { id: "base-1" }, idempotent: false })) as never,
      acceptBase: vi.fn(async () => undefined),
      generateMood: vi.fn(async () => ({ asset: { id: "mood-1" }, idempotent: false })) as never,
      generateMoodPack: vi.fn(async () => []),
      deletePack: vi.fn(async () => ({ deletedObjects: 0 })),
    },
  };
}

async function request(
  dependencies: CharacterPackRouteDependencies,
  path: string,
  init: RequestInit = {},
) {
  server = createServer(async (req, res) => {
    if (
      !(await handleCharacterPackRoute(
        req,
        res,
        new URL(req.url ?? "/", "http://local"),
        dependencies,
      ))
    ) {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("missing test port");
  return fetch(`http://127.0.0.1:${address.port}${path}`, init);
}

describe("character pack routes", () => {
  it("creates a draft pack owned only by the authenticated user", async () => {
    const dependencies = deps();
    const response = await request(dependencies, "/ai/characters/packs", {
      method: "POST",
      headers: { authorization: "Bearer valid", "content-type": "application/json" },
      body: JSON.stringify({
        clientPackId: "pack-from-browser",
        slotId: "lead_suming",
        brief: "Adult founder",
      }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      ownerId: "owner-a",
      slotId: "lead_suming",
    });
  });

  it("requires auth and maps invalid input to 422", async () => {
    const unauthorized = await request(deps(), "/ai/characters/packs", {
      method: "POST",
      body: "{}",
    });
    expect(unauthorized.status).toBe(401);
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    server = undefined;
    const invalid = await request(deps(), "/ai/characters/packs", {
      method: "POST",
      headers: { authorization: "Bearer valid" },
      body: JSON.stringify({ slotId: "bad slot" }),
    });
    expect(invalid.status).toBe(422);
  });

  it.each([
    [new CharacterGenerationPaymentError("INSUFFICIENT", "not enough"), 402],
    [new CharacterGenerationBusyError(), 409],
  ] as const)("maps generation domain failures to stable HTTP status", async (failure, status) => {
    const dependencies = deps();
    vi.mocked(dependencies.generation.generateBase).mockRejectedValueOnce(failure);
    const response = await request(dependencies, "/ai/characters/packs/pack-1/base", {
      method: "POST",
      headers: { authorization: "Bearer valid", "content-type": "application/json" },
      body: JSON.stringify({ clientActionId: "action-1", kind: "human", prompt: "portrait" }),
    });
    expect(response.status).toBe(status);
  });

  it("delegates accept, moods, and delete with the authenticated owner", async () => {
    const dependencies = deps();
    const calls = [
      ["/ai/characters/packs/pack-1/base/accept", "POST"],
      ["/ai/characters/packs/pack-1/moods", "POST"],
      ["/ai/characters/packs/pack-1", "DELETE"],
    ] as const;
    for (const [path, method] of calls) {
      const response = await request(dependencies, path, {
        method,
        headers: { authorization: "Bearer valid", "content-type": "application/json" },
        body:
          method === "POST" && path.endsWith("moods")
            ? JSON.stringify({ clientActionId: "moods-1", kind: "human", prompt: "same identity" })
            : undefined,
      });
      expect(response.status).toBe(200);
      await new Promise<void>((resolve) => server?.close(() => resolve()));
      server = undefined;
    }
    expect(dependencies.generation.acceptBase).toHaveBeenCalledWith("owner-a", "pack-1");
    expect(dependencies.generation.deletePack).toHaveBeenCalledWith("owner-a", "pack-1");
  });
});
