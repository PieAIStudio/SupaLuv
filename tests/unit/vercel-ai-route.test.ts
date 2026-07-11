import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeAiBranchServiceUrl } from "../../services/ai-branch/src/serviceMount.js";

type VercelConfig = {
  services?: Record<string, Record<string, unknown>>;
  rewrites?: Array<{ source: string; destination: string | { service: string } }>;
};

const config = JSON.parse(
  readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"),
) as VercelConfig;

describe("Vercel service routing", () => {
  it("builds the existing Vite and Node services together", () => {
    expect(config.services).toMatchObject({
      web: {
        root: "apps/web",
        framework: "vite",
        rewrites: [{ source: "/((?!assets/).*)", destination: "/index.html" }],
      },
      "ai-branch": {
        root: "services/ai-branch",
        framework: "node",
        entrypoint: "src/server.ts",
      },
    });
  });

  it.each([
    ["/api", "/api"],
    ["/api/", "/api"],
    ["/api/ai/health?probe=1", "/health"],
    ["/api/ai/branch", "/ai/branch"],
    ["/api/choice-stats", "/choice-stats"],
    ["/api/choice-stats/record", "/choice-stats/record"],
    ["/api/tts/preview", "/tts/preview"],
    ["/api/tts/synthesize", "/tts/synthesize"],
    ["/api/wallet/balance", "/wallet/balance"],
  ])("normalizes the mounted service route %s", (publicPath, servicePath) => {
    const normalized = normalizeAiBranchServiceUrl(new URL(publicPath, "https://preview.example"));
    expect(normalized.pathname).toBe(servicePath);
  });

  it("leaves the local canonical service routes unchanged", () => {
    expect(normalizeAiBranchServiceUrl(new URL("http://127.0.0.1:8787/health")).pathname).toBe(
      "/health",
    );
    expect(normalizeAiBranchServiceUrl(new URL("http://127.0.0.1:8787/apiary")).pathname).toBe(
      "/apiary",
    );
  });

  it("routes only the public API surface to the private AI service", () => {
    expect(config.rewrites).toContainEqual({
      source: "/api",
      destination: { service: "ai-branch" },
    });
    expect(config.rewrites).toContainEqual({
      source: "/api/(.*)",
      destination: { service: "ai-branch" },
    });
    expect(config.rewrites).toContainEqual({
      source: "/(.*)",
      destination: { service: "web" },
    });
  });
});
