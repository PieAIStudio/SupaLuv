import { homedir } from "node:os";
import { join } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { loadPublicEnvFile } from "./localPublicEnv";

const webPort = Number(process.env.SUPALUV_WEB_PORT ?? process.env.SUPALUV_E2E_WEB_PORT ?? 5173);
const aiBranchTarget = process.env.SUPALUV_AI_BRANCH_PROXY ?? "http://127.0.0.1:8787";

/** Load the first local public-config file; injected shell/Vercel values keep priority. */
function loadLocalPublicEnv() {
  const candidates = [
    process.env.SUPALUV_PUBLIC_ENV_FILE,
    join(homedir(), "PieAI", ".secrets", "supaluv", "local.public.env"),
  ].filter((value): value is string => Boolean(value));

  for (const path of candidates) {
    if (loadPublicEnvFile(path)) {
      break;
    }
  }
}

loadLocalPublicEnv();

export default defineConfig(() => {
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
