/**
 * AI edge process entry — load secrets, listen, dispatch to routeTable.
 * Do not add product logic here; extend routeTable / walletMeter / ttsCatalog.
 */

import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { hasOpenRouterKey, sendJson } from "./httpUtils.js";
import { handleAiBranchRequest } from "./routeTable.js";

const PORT = Number(process.env.SUPALUV_AI_BRANCH_PORT ?? 8787);
const HOST = process.env.SUPALUV_AI_BRANCH_HOST ?? "127.0.0.1";

function loadDotEnvFile(path: string): void {
  if (!existsSync(path)) {
    return;
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
    let value = body.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env) || !process.env[key]) {
      process.env[key] = value;
    }
  }
}

function loadSecrets(): void {
  const candidates = [
    process.env.SUPALUV_SECRETS_FILE,
    join(homedir(), "PieAI", ".secrets", "supaluv.env"),
    "/Users/yuanfei/PieAI/.secrets/supaluv.env",
    join(process.cwd(), ".env"),
    join(process.cwd(), "..", "..", ".env"),
  ].filter((value): value is string => Boolean(value));

  for (const path of candidates) {
    loadDotEnvFile(path);
  }
}

loadSecrets();

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);
  const handled = await handleAiBranchRequest(req, res, url);
  if (!handled) {
    sendJson(res, 404, { error: "Not found" });
  }
});

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[supaluv-ai-branch] http://${HOST}:${PORT}  openRouter=${hasOpenRouterKey() ? "yes" : "NO KEY"}`,
  );
});
