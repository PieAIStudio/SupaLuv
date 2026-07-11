import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sendJson } from "../../services/ai-branch/src/httpUtils.js";
import { handleAiBranchRequest } from "../../services/ai-branch/src/routeTable.js";
import { normalizeAiBranchServiceUrl } from "../../services/ai-branch/src/serviceMount.js";

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

describe("AI route authentication order", () => {
  it("rejects unauthenticated AI generation before reporting provider configuration", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("SWIMMER_CORE_SUPABASE_URL", "");
    vi.stubEnv("SWIMMER_CORE_PUBLISHABLE_KEY", "");

    server = createServer(async (req, res) => {
      const handled = await handleAiBranchRequest(
        req,
        res,
        normalizeAiBranchServiceUrl(new URL(req.url ?? "/", "http://127.0.0.1")),
      );
      if (!handled) {
        sendJson(res, 404, { error: "Not found" });
      }
    });
    await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Test server did not expose a TCP port");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/ai/branch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        storyId: "ch01",
        sceneId: "start",
        config: { rejoinSceneId: "end" },
      }),
    });
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toMatch(/auth|authorization/i);
    expect(body.error).not.toMatch(
      /configured|SwimmerCore|URL|key|OPENROUTER|\/Users\/|\.secrets/i,
    );
  });

  it.each(["/api", "/api/", "/api/nope"])("returns 404 for unknown API route %s", async (path) => {
    server = createServer(async (req, res) => {
      const handled = await handleAiBranchRequest(
        req,
        res,
        normalizeAiBranchServiceUrl(new URL(req.url ?? "/", "http://127.0.0.1")),
      );
      if (!handled) {
        sendJson(res, 404, { error: "Not found" });
      }
    });
    await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Test server did not expose a TCP port");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
    expect(response.status).toBe(404);
  });
});
