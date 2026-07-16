/**
 * AI edge process entry — load secrets, listen, dispatch to routeTable.
 * Do not add product logic here; extend routeTable / walletMeter / ttsCatalog.
 */

import { createServer } from "node:http";
import { homedir } from "node:os";
import { join } from "node:path";
import { firstDefinedEnv } from "@pieai/swimmer-ai-kit/env";
import { hasOpenRouterKey, sendJson } from "./httpUtils.js";
import { loadPublicEnvFileForServer, loadServerEnvFile } from "./localServerEnv.js";
import { handleAiBranchRequest } from "./routeTable.js";
import { normalizeAiBranchServiceUrl } from "./serviceMount.js";

function loadSecrets(): void {
  const serverCandidates = [
    process.env.SUPALUV_SERVER_ENV_FILE,
    join(homedir(), "PieAI", ".secrets", "supaluv", "local.server.env"),
  ].filter((value): value is string => Boolean(value));
  const publicCandidates = [
    process.env.SUPALUV_PUBLIC_ENV_FILE,
    join(homedir(), "PieAI", ".secrets", "supaluv", "local.public.env"),
  ].filter((value): value is string => Boolean(value));

  for (const path of serverCandidates) {
    if (loadServerEnvFile(path)) {
      break;
    }
  }
  for (const path of publicCandidates) {
    if (loadPublicEnvFileForServer(path)) {
      break;
    }
  }
}

loadSecrets();

const PORT = Number(firstDefinedEnv(process.env, ["PORT", "SUPALUV_AI_BRANCH_PORT"]) ?? 8787);
const HOST = process.env.SUPALUV_AI_BRANCH_HOST ?? "127.0.0.1";

const server = createServer(async (req, res) => {
  const url = normalizeAiBranchServiceUrl(new URL(req.url ?? "/", `http://${HOST}:${PORT}`));
  const handled = await handleAiBranchRequest(req, res, url);
  if (!handled) {
    sendJson(res, 404, { error: "Not found" });
  }
});

if (!process.env.VERCEL) {
  server.listen(PORT, HOST, () => {
    // eslint-disable-next-line no-console
    console.log(
      `[supaluv-ai-branch] http://${HOST}:${PORT}  openRouter=${hasOpenRouterKey() ? "yes" : "NO KEY"}`,
    );
  });
}

export default server;
