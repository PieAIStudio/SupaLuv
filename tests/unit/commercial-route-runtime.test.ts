import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleCharacterAssetRoute } from "../../services/ai-branch/src/character/characterAssetService.js";
import { handleCharacterPackRoute } from "../../services/ai-branch/src/character/characterRoutes.js";
import {
  createCommercialRouteRuntime,
  getCommercialRouteRuntime,
} from "../../services/ai-branch/src/commercialRouteRuntime.js";
import {
  commercialServerCredentialsConfigured,
  resolveCommercialServerCredentials,
} from "../../services/ai-branch/src/commercialServerConfig.js";
import { handleEndingRoute } from "../../services/ai-branch/src/ending/endingRoutes.js";
import { sendJson } from "../../services/ai-branch/src/httpUtils.js";
import { createInMemoryPersistenceModules } from "../../services/ai-branch/src/persistence/index.js";
import { handleAiBranchRequest } from "../../services/ai-branch/src/routeTable.js";
import { normalizeAiBranchServiceUrl } from "../../services/ai-branch/src/serviceMount.js";
import { handleSpendRoute } from "../../services/ai-branch/src/wallet/spendRoutes.js";
import { walletMeterConfigured } from "../../services/ai-branch/src/wallet/walletMeter.js";

let server: Server | undefined;

afterEach(async () => {
  vi.unstubAllEnvs();
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()));
    });
    server = undefined;
  }
});

function mockBinaryStorage() {
  return {
    createSignedUpload: vi.fn(async () => ({
      signedUrl: "https://upload.invalid/signed",
      token: "token",
    })),
    inspect: vi.fn(async () => ({ mimeType: "image/jpeg", sizeBytes: 12 })),
    remove: vi.fn(async () => undefined),
    download: vi.fn(async () => ({
      bytes: new Uint8Array([1, 2, 3]),
      mimeType: "image/jpeg" as const,
    })),
    uploadGenerated: vi.fn(async () => undefined),
    createSignedDownload: vi.fn(async () => "https://download.invalid/signed"),
  };
}

function testRuntime(overrides: Parameters<typeof createCommercialRouteRuntime>[0] = {}) {
  const persistence = createInMemoryPersistenceModules();
  const client = { tag: "shared-client" } as never;
  const clientFactory = vi.fn(() => client);
  const createPersistenceFromClient = vi.fn(() => persistence);
  const createAssetStorage = vi.fn(() => mockBinaryStorage());
  const runtime = createCommercialRouteRuntime({
    env: {
      nodeEnv: "test",
      supabaseUrl: "https://example.supabase.co",
      serviceRoleKey: "service-role-test",
      sightengineApiUser: "user",
      sightengineApiSecret: "secret",
      referenceCleanupSecret: "cleanup",
      characterBaseCostBatteries: "1",
      characterMoodCostBatteries: "1",
      endingSegmentCostBatteries: "1",
    },
    clientFactory,
    createPersistenceFromClient,
    createAssetStorage,
    createCharacterProviders: () =>
      ({
        imageProvider: { generate: vi.fn() },
        adultReviewer: { reviewImage: vi.fn() },
      }) as never,
    createEndingGenerator: () =>
      ({
        generateSegment: vi.fn(),
      }) as never,
    createModeration: () => ({
      reviewText: async () => ({ allowed: true, categories: [] }),
      reviewImage: async () => ({ allowed: true, categories: [] }),
    }),
    wallet: {
      reserve: async () => ({
        ok: true as const,
        reservationId: "r1",
        amountPowerUnits: 100,
        skipped: false,
      }),
      commit: async () => undefined,
      refund: async () => undefined,
    },
    verifyAuth: async (authorization) =>
      authorization === "Bearer valid"
        ? { ok: true as const, userId: "owner-a", isAnonymous: false }
        : { ok: false as const, status: 401 as const, error: "Missing authorization" },
    ...overrides,
  });
  return {
    runtime,
    client,
    clientFactory,
    createPersistenceFromClient,
    createAssetStorage,
    persistence,
  };
}

describe("commercial route runtime composition", () => {
  it("keeps commercial construction lazy: importing routeTable does not need database credentials", async () => {
    vi.stubEnv("SWIMMER_CORE_SUPABASE_URL", "");
    vi.stubEnv("SWIMMER_CORE_SECRET_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");

    // The already-loaded route table remains usable without commercial secrets.
    const table = await import("../../services/ai-branch/src/routeTable.js");
    expect(typeof table.handleAiBranchRequest).toBe("function");

    server = createServer(async (req, res) => {
      const handled = await table.handleAiBranchRequest(
        req,
        res,
        normalizeAiBranchServiceUrl(new URL(req.url ?? "/", "http://127.0.0.1")),
      );
      if (!handled) sendJson(res, 404, { error: "Not found" });
    });
    await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("missing port");

    const health = await fetch(`http://127.0.0.1:${address.port}/health`);
    expect(health.status).toBe(200);
    const body = (await health.json()) as { ok?: boolean; service?: string };
    expect(body.ok).toBe(true);
    expect(body.service).toBe("supaluv-ai-branch");

    const unknown = await fetch(`http://127.0.0.1:${address.port}/api/nope`);
    expect(unknown.status).toBe(404);
  });

  it("reuses one shared Supabase client and persistence set across commercial route families", () => {
    const {
      runtime,
      client,
      clientFactory,
      createPersistenceFromClient,
      createAssetStorage,
      persistence,
    } = testRuntime();

    expect(clientFactory).not.toHaveBeenCalled();
    expect(createPersistenceFromClient).not.toHaveBeenCalled();

    const assets = runtime.getCharacterAssetDependencies();
    const pack = runtime.getCharacterPackDependencies();
    const ending = runtime.getEndingDependencies();
    const spend = runtime.getSpendReceiptReader();

    expect(clientFactory).toHaveBeenCalledTimes(1);
    expect(createPersistenceFromClient).toHaveBeenCalledTimes(1);
    expect(createAssetStorage).toHaveBeenCalledOnce();
    expect(createAssetStorage).toHaveBeenCalledWith(client);
    expect(pack.store).toBe(persistence.characterGeneration);
    expect(ending.store).toBe(persistence.endingSession);
    expect(spend).toBe(persistence.spendReceipts);
    expect(assets.cleanupSecret).toBe("cleanup");

    // Warm runtime: second access reuses caches without new client/persistence.
    runtime.getCharacterPackDependencies();
    runtime.getEndingDependencies();
    runtime.getSpendReceiptReader();
    expect(clientFactory).toHaveBeenCalledTimes(1);
    expect(createPersistenceFromClient).toHaveBeenCalledTimes(1);
  });

  it("supports dependency factory injection without real secrets", async () => {
    const persistence = createInMemoryPersistenceModules();
    await persistence.characterGeneration.saveCharacterPack({
      id: "pack-1",
      ownerId: "owner-a",
      clientPackId: "client-pack-1",
      slotId: "lead_suming",
      brief: { text: "brief" },
      status: "draft",
    });

    const { runtime } = testRuntime({
      createPersistenceFromClient: () => persistence,
      env: {
        nodeEnv: "test",
        supabaseUrl: "https://fake.supabase.co",
        serviceRoleKey: "fake-key",
      },
    });

    const packDeps = runtime.getCharacterPackDependencies();
    const pack = await packDeps.store.getCharacterPack("owner-a", "pack-1");
    expect(pack?.clientPackId).toBe("client-pack-1");

    // Spend reader is available via the same injected persistence (read-only).
    const receipts = await runtime.getSpendReceiptReader().listSpendReceipts("owner-a");
    expect(receipts).toEqual([]);
    expect(persistence).not.toHaveProperty("sideBranchSpend");
  });

  it("agrees with walletMeter on configured vs unconfigured commercial credentials", () => {
    vi.stubEnv("SWIMMER_CORE_SUPABASE_URL", "");
    vi.stubEnv("SWIMMER_CORE_SECRET_KEY", "");
    vi.stubEnv("VITE_SWIMMER_CORE_SUPABASE_URL", "https://vite.invalid");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "generic-service-role");

    expect(resolveCommercialServerCredentials()).toBeNull();
    expect(commercialServerCredentialsConfigured()).toBe(false);
    expect(walletMeterConfigured()).toBe(false);

    const unconfigured = createCommercialRouteRuntime();
    expect(() => unconfigured.getSpendReceiptReader()).toThrow(
      /Spend analysis database credentials are required/,
    );

    vi.stubEnv("SWIMMER_CORE_SUPABASE_URL", "  https://core.invalid  ");
    vi.stubEnv("SWIMMER_CORE_SECRET_KEY", "  secret-key  ");

    expect(resolveCommercialServerCredentials()).toEqual({
      supabaseUrl: "https://core.invalid",
      serviceRoleKey: "secret-key",
    });
    expect(walletMeterConfigured()).toBe(true);
    expect(commercialServerCredentialsConfigured()).toBe(true);

    // Deterministic injection still trims and enables shared construction without process secrets.
    const { runtime, clientFactory } = testRuntime({
      env: {
        nodeEnv: "test",
        supabaseUrl: "  https://injected.invalid  ",
        serviceRoleKey: "  injected-key  ",
      },
    });
    runtime.getSpendReceiptReader();
    expect(clientFactory).toHaveBeenCalledWith(
      "https://injected.invalid",
      "injected-key",
      expect.any(Object),
    );
  });

  it("does not resolve commercial credentials from deprecated aliases in source", () => {
    const root = join(process.cwd(), "services/ai-branch/src");
    const stripComments = (source: string) =>
      source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    for (const name of [
      "wallet/walletMeter.ts",
      "commercialRouteRuntime.ts",
      "commercialServerConfig.ts",
    ]) {
      const code = stripComments(readFileSync(join(root, name), "utf8"));
      expect(code).not.toContain("VITE_SWIMMER_CORE_SUPABASE_URL");
      expect(code).not.toContain("VITE_SUPABASE_URL");
      expect(code).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    }
    const walletSource = readFileSync(join(root, "wallet/walletMeter.ts"), "utf8");
    expect(walletSource).toContain("resolveCommercialServerCredentials");
    expect(walletSource).toContain("settleReservation");
    const configSource = readFileSync(join(root, "commercialServerConfig.ts"), "utf8");
    expect(configSource).toContain("SWIMMER_CORE_SUPABASE_URL");
    expect(configSource).toContain("SWIMMER_CORE_SECRET_KEY");
  });

  it("retries shared construction after a transient factory failure", () => {
    const persistence = createInMemoryPersistenceModules();
    const client = { tag: "retry-client" } as never;
    const clientFactory = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("transient client failure");
      })
      .mockReturnValue(client);
    const createPersistenceFromClient = vi.fn(() => persistence);
    const runtime = testRuntime({ clientFactory, createPersistenceFromClient }).runtime;

    expect(() => runtime.getSpendReceiptReader()).toThrow(/transient client failure/);
    expect(runtime.getSpendReceiptReader()).toBe(persistence.spendReceipts);
    expect(clientFactory).toHaveBeenCalledTimes(2);
    expect(createPersistenceFromClient).toHaveBeenCalledOnce();
  });

  it("preserves auth-before-provider order and unavailable-service mapping", async () => {
    server = createServer(async (req, res) => {
      const handled = await handleAiBranchRequest(
        req,
        res,
        normalizeAiBranchServiceUrl(new URL(req.url ?? "/", "http://127.0.0.1")),
      );
      if (!handled) sendJson(res, 404, { error: "Not found" });
    });
    await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("missing port");
    const base = `http://127.0.0.1:${address.port}`;

    vi.stubEnv("SWIMMER_CORE_SUPABASE_URL", "");
    vi.stubEnv("SWIMMER_CORE_SECRET_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");

    const unauthBranch = await fetch(`${base}/ai/branch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        storyId: "ch01",
        sceneId: "start",
        config: { rejoinSceneId: "end" },
      }),
    });
    expect(unauthBranch.status).toBe(401);

    // Missing commercial secrets map to family-specific unavailable codes (after auth on player routes).
    const pack = await fetch(`${base}/ai/characters/packs`, {
      method: "POST",
      headers: {
        authorization: "Bearer anything",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        clientPackId: "p1",
        slotId: "lead_suming",
        brief: "x",
      }),
    });
    // Auth gate may 401 first when Swimmer publishable keys are also absent — either 401 or 503.
    expect([401, 503]).toContain(pack.status);
    if (pack.status === 503) {
      const body = (await pack.json()) as { error?: string };
      expect(body.error).toBe("CHARACTER_SERVICE_UNAVAILABLE");
    }

    const ending = await fetch(`${base}/ai/endings/sessions`, {
      method: "POST",
      headers: {
        authorization: "Bearer anything",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        storyRunId: "00000000-0000-4000-8000-000000000001",
        clientRunId: "run",
        clientSessionId: "sess",
        clientActionId: "act",
      }),
    });
    expect([401, 503]).toContain(ending.status);
    if (ending.status === 503) {
      const body = (await ending.json()) as { error?: string };
      expect(body.error).toBe("AI_ENDING_SERVICE_UNAVAILABLE");
    }

    const spend = await fetch(`${base}/ai/spend`, {
      headers: { authorization: "Bearer anything" },
    });
    expect([401, 503]).toContain(spend.status);
    if (spend.status === 503) {
      const body = (await spend.json()) as { error?: string };
      expect(body.error).toBe("SPEND_ANALYSIS_UNAVAILABLE");
    }
  });

  it("keeps exact missing-secret failures for asset / pack / ending / spend construction", () => {
    const empty = createCommercialRouteRuntime({
      env: { nodeEnv: "development" },
    });
    // Development asset fallback does not throw.
    const assets = empty.getCharacterAssetDependencies();
    expect(assets.assets).toBeTruthy();

    expect(() => empty.getCharacterPackDependencies()).toThrow(
      /SupaLuv character database credentials are required/,
    );
    expect(() => empty.getEndingDependencies()).toThrow(
      /AI ending database credentials are required/,
    );
    expect(() => empty.getSpendReceiptReader()).toThrow(
      /Spend analysis database credentials are required/,
    );

    const productionEmpty = createCommercialRouteRuntime({
      env: { nodeEnv: "production" },
    });
    expect(() => productionEmpty.getCharacterAssetDependencies()).toThrow(
      /SupaLuv character storage credentials are required in production/,
    );
    expect(() => productionEmpty.getCharacterAssetDependencies()).toThrow(
      /SupaLuv character storage credentials are required in production/,
    );
  });

  it("routes accept explicit injected dependencies without the production singleton", async () => {
    const { runtime } = testRuntime();
    const packDeps = runtime.getCharacterPackDependencies();
    const endingDeps = runtime.getEndingDependencies();
    const spendReceiptReader = runtime.getSpendReceiptReader();

    server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      if (await handleCharacterPackRoute(req, res, url, packDeps)) return;
      if (await handleEndingRoute(req, res, url, endingDeps)) return;
      if (
        await handleSpendRoute(req, res, url, {
          verifyAuth: packDeps.verifyAuth,
          getStore: () => spendReceiptReader,
        })
      ) {
        return;
      }
      if (await handleCharacterAssetRoute(req, res, url, runtime.getCharacterAssetDependencies())) {
        return;
      }
      res.writeHead(404).end();
    });
    await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("missing port");

    const unauth = await fetch(`http://127.0.0.1:${address.port}/ai/characters/packs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientPackId: "p1",
        slotId: "lead_suming",
        brief: "hello",
      }),
    });
    expect(unauth.status).toBe(401);

    const createPack = await fetch(`http://127.0.0.1:${address.port}/ai/characters/packs`, {
      method: "POST",
      headers: {
        authorization: "Bearer valid",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        clientPackId: "p1",
        slotId: "lead_suming",
        brief: "hello",
      }),
    });
    expect(createPack.status).toBe(201);

    const spend = await fetch(`http://127.0.0.1:${address.port}/ai/spend`, {
      headers: { authorization: "Bearer valid" },
    });
    expect(spend.status).toBe(200);
  });

  it("deletes old per-module configured caches and duplicated env reads", () => {
    const root = join(process.cwd(), "services/ai-branch/src");
    const targets = [
      "character/characterAssetService.ts",
      "character/characterRoutes.ts",
      "ending/endingRoutes.ts",
      "wallet/spendRoutes.ts",
    ] as const;

    let processEnvCount = 0;
    let configuredCacheCount = 0;
    let oldGetterCount = 0;

    for (const name of targets) {
      const source = readFileSync(join(root, name), "utf8");
      processEnvCount += (source.match(/process\.env/g) ?? []).length;
      configuredCacheCount += (
        source.match(/\blet configured(?:Dependencies)?\b|\blet modules\b/g) ?? []
      ).length;
      oldGetterCount += (
        source.match(
          /getConfiguredCharacterAssetDependencies|getConfiguredCharacterPackDependencies|getConfiguredEndingDependencies|configuredSpendModules/g,
        ) ?? []
      ).length;
      expect(source).not.toContain("commercialRouteRuntime");
    }

    expect(processEnvCount).toBe(0);
    expect(configuredCacheCount).toBe(0);
    expect(oldGetterCount).toBe(0);

    // Production entry still uses the composition runtime (not a thin re-export of old getters).
    const runtimeSource = readFileSync(join(root, "commercialRouteRuntime.ts"), "utf8");
    expect(runtimeSource).toContain("createCommercialRouteRuntime");
    expect(runtimeSource).toContain("getCommercialRouteRuntime");
    expect(runtimeSource).not.toMatch(/getConfiguredCharacterAssetDependencies\s*\(/);
    expect(runtimeSource).not.toMatch(
      /getCharacterAssetRouteDependencies|getCharacterPackRouteDependencies|getEndingRouteDependencies|getSpendRouteModules/,
    );
  });

  it("exposes a production lazy singleton accessor", () => {
    const a = getCommercialRouteRuntime();
    const b = getCommercialRouteRuntime();
    expect(a).toBe(b);
  });
});
