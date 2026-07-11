import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";
import { loadPublicEnvFile } from "../../apps/web/localPublicEnv";
import {
  loadPublicEnvFileForServer,
  loadServerEnvFile,
} from "../../services/ai-branch/src/localServerEnv";

test("server env loader rejects browser-exposed keys", () => {
  const path = tempEnv("OPENROUTER_API_KEY=server-only\nVITE_POSTHOG_KEY=public\n");

  assert.throws(
    () => loadServerEnvFile(path, {}),
    /Server env file must not contain VITE_POSTHOG_KEY/,
  );
});

test("public env loader rejects server-only keys", () => {
  const path = tempEnv("VITE_POSTHOG_KEY=public\nOPENROUTER_API_KEY=server-only\n");

  assert.throws(
    () => loadPublicEnvFile(path, {}),
    /Public env file must not contain OPENROUTER_API_KEY/,
  );
});

test("local env files do not override injected environment values", () => {
  const serverPath = tempEnv("OPENROUTER_API_KEY=from-file\n");
  const publicPath = tempEnv("VITE_POSTHOG_KEY=from-file\n");
  const serverEnv: Record<string, string | undefined> = {
    OPENROUTER_API_KEY: "from-shell",
  };
  const publicEnv: Record<string, string | undefined> = {
    VITE_POSTHOG_KEY: "from-vercel",
  };

  assert.equal(loadServerEnvFile(serverPath, serverEnv), true);
  assert.equal(loadPublicEnvFile(publicPath, publicEnv), true);
  assert.equal(serverEnv.OPENROUTER_API_KEY, "from-shell");
  assert.equal(publicEnv.VITE_POSTHOG_KEY, "from-vercel");
});

test("missing local env files are optional", () => {
  const missing = join(mkdtempSync(join(tmpdir(), "supaluv-env-missing-")), "missing.env");

  assert.equal(loadServerEnvFile(missing, {}), false);
  assert.equal(loadPublicEnvFile(missing, {}), false);
});

test("server may load browser-safe config without accepting private keys", () => {
  const publicPath = tempEnv("VITE_SWIMMER_CORE_SUPABASE_URL=https://example.test\n");
  const mixedPath = tempEnv("VITE_POSTHOG_KEY=public\nSWIMMER_CORE_SECRET_KEY=private\n");
  const env: Record<string, string | undefined> = {};

  assert.equal(loadPublicEnvFileForServer(publicPath, env), true);
  assert.equal(env.VITE_SWIMMER_CORE_SUPABASE_URL, "https://example.test");
  assert.throws(
    () => loadPublicEnvFileForServer(mixedPath, {}),
    /Public env file must not contain SWIMMER_CORE_SECRET_KEY/,
  );
});

function tempEnv(content: string): string {
  const path = join(mkdtempSync(join(tmpdir(), "supaluv-env-")), "local.env");
  writeFileSync(path, content);
  return path;
}
