import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const webPort = Number(process.env.SUPALUV_WEB_PORT ?? process.env.SUPALUV_E2E_WEB_PORT ?? 5173);
const aiBranchTarget = process.env.SUPALUV_AI_BRANCH_PROXY ?? "http://127.0.0.1:8787";

/** Load Pie shared secrets into process.env for VITE_* only (never server keys). */
function loadSharedViteSecrets() {
  const candidates = [
    process.env.SUPALUV_SECRETS_FILE,
    join(homedir(), "PieAI", ".secrets", "supaluv.env"),
    "/Users/yuanfei/PieAI/.secrets/supaluv.env",
  ].filter((value): value is string => Boolean(value));

  for (const path of candidates) {
    if (!existsSync(path)) {
      continue;
    }
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const body = trimmed.startsWith("export ") ? trimmed.slice(7) : trimmed;
      const eq = body.indexOf("=");
      if (eq <= 0) {
        continue;
      }
      const key = body.slice(0, eq).trim();
      if (!key.startsWith("VITE_")) {
        continue;
      }
      let value = body.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
    break;
  }
}

loadSharedViteSecrets();

export default defineConfig(({ mode }) => {
  // Ensure mode .env files still win when present.
  loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      host: "127.0.0.1",
      port: webPort,
      proxy: {
        "/api/ai/branch": {
          target: aiBranchTarget,
          changeOrigin: true,
          rewrite: () => "/ai/branch",
        },
        "/api/ai/health": {
          target: aiBranchTarget,
          changeOrigin: true,
          rewrite: () => "/health",
        },
        "/api/choice-stats": {
          target: aiBranchTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/choice-stats/, "/choice-stats"),
        },
        "/api/tts/synthesize": {
          target: aiBranchTarget,
          changeOrigin: true,
          rewrite: () => "/tts/synthesize",
        },
        "/api/tts/preview": {
          target: aiBranchTarget,
          changeOrigin: true,
          rewrite: () => "/tts/preview",
        },
        "/api/wallet/balance": {
          target: aiBranchTarget,
          changeOrigin: true,
          rewrite: () => "/wallet/balance",
        },
      },
    },
    preview: {
      host: "127.0.0.1",
      port: webPort + 100,
    },
  };
});
