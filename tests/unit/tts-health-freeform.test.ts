import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sendJson } from "../../services/ai-branch/src/httpUtils.js";
import { handleAiBranchRequest } from "../../services/ai-branch/src/routeTable.js";
import { normalizeAiBranchServiceUrl } from "../../services/ai-branch/src/serviceMount.js";
import { isTtsFreeformEnabled, ttsHealthSnapshot } from "../../services/ai-branch/src/ttsRoute.js";

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

async function getHealthBody(): Promise<Record<string, unknown>> {
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
  if (!address || typeof address === "string") throw new Error("Missing test port");

  const response = await fetch(`http://127.0.0.1:${address.port}/health`);
  expect(response.status).toBe(200);
  return (await response.json()) as Record<string, unknown>;
}

describe("tts health freeform capability", () => {
  it("exposes freeformEnabled=false and providers when env is unset", async () => {
    vi.stubEnv("SUPALUV_TTS_ALLOW_FREEFORM", "");
    expect(isTtsFreeformEnabled()).toBe(false);

    const body = await getHealthBody();
    const tts = body.tts as {
      providers?: Record<string, boolean>;
      freeformEnabled?: boolean;
      elevenlabs?: boolean;
    };

    expect(tts.freeformEnabled).toBe(false);
    expect(tts.providers).toEqual(expect.objectContaining({}));
    expect(typeof tts.providers?.elevenlabs).toBe("boolean");
    expect(typeof tts.providers?.minimax).toBe("boolean");
    // Do not leak flat provider flags as secret-bearing or confuse the client shape.
    expect(tts.elevenlabs).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/sk-|api[_-]?key|secret/i);
  });

  it("exposes freeformEnabled=true only when env is exactly 1", async () => {
    vi.stubEnv("SUPALUV_TTS_ALLOW_FREEFORM", "1");
    expect(isTtsFreeformEnabled()).toBe(true);
    expect(ttsHealthSnapshot().freeformEnabled).toBe(true);

    const body = await getHealthBody();
    const tts = body.tts as { freeformEnabled?: boolean; providers?: Record<string, boolean> };
    expect(tts.freeformEnabled).toBe(true);
    expect(tts.providers).toBeTypeOf("object");
  });

  it("treats non-1 freeform values as disabled", () => {
    vi.stubEnv("SUPALUV_TTS_ALLOW_FREEFORM", "true");
    expect(isTtsFreeformEnabled()).toBe(false);
    expect(ttsHealthSnapshot().freeformEnabled).toBe(false);

    vi.stubEnv("SUPALUV_TTS_ALLOW_FREEFORM", "0");
    expect(isTtsFreeformEnabled()).toBe(false);
  });
});
