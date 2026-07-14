import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { loadPublicEnvFile } from "./localPublicEnv";
import { createCreatorStudioDevPlugin } from "./src/creator/server/creatorStudioDevPlugin";
import { shouldEnableCreatorStudio } from "./src/creator/server/creatorStudioServer";

const webPort = Number(process.env.SUPALUV_WEB_PORT ?? process.env.SUPALUV_E2E_WEB_PORT ?? 5173);
const aiBranchTarget = process.env.SUPALUV_AI_BRANCH_PROXY ?? "http://127.0.0.1:8787";
const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));

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

export default defineConfig(({ command, mode }) => {
  const creatorPlugin = shouldEnableCreatorStudio(command, mode)
    ? [createCreatorStudioDevPlugin({ repoRoot })]
    : [];
  return {
    plugins: [react(), ...creatorPlugin],
    optimizeDeps: {
      // E2E reaches these through later lazy routes. Pre-bundling them prevents
      // Vite from replacing the dependency cache while an earlier page still
      // references the previous optimized URLs on slower CI runners.
      include: ["react", "react-dom", "react/jsx-runtime", "@pieai/swimmer-ui-kit"],
    },
    build: {
      rolldownOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return undefined;
            }
            if (id.includes("/react/") || id.includes("/react-dom/")) {
              return "react-vendor";
            }
            if (id.includes("@supabase") || id.includes("/ws/")) {
              return "auth-vendor";
            }
            if (id.includes("@pieai/swimmer-ui-kit")) {
              return "ui-vendor";
            }
            if (id.includes("howler")) {
              return "audio-vendor";
            }
            return undefined;
          },
        },
      },
    },
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
