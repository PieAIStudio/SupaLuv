import { readFileSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { resolve } from "node:path";

const result = spawnSync("pnpm", ["--filter", "@supaluv/web", "build"], {
  cwd: resolve(import.meta.dirname, ".."),
  encoding: "utf8"
});
const buildOutput = (result.stdout ?? "") + (result.stderr ?? "");
const dist = resolve(import.meta.dirname, "../apps/web/dist");

let entrypointPresent = 0;
let initialJsBytes = 0;
let initialJsGzipBytes = 0;
let totalJsBytes = 0;
let largestJsBytes = 0;

if (result.status === 0) {
  const html = readFileSync(resolve(dist, "index.html"), "utf8");
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.js)["'][^>]*>/g)].map(
    (match) => match[1]
  );
  const modulePreloads = [...html.matchAll(/<link\b[^>]*>/g)]
    .map((match) => match[0])
    .filter((tag) => /\brel=["']modulepreload["']/.test(tag))
    .map((tag) => /\bhref=["']([^"']+\.js)["']/.exec(tag)?.[1])
    .filter((entry) => entry !== undefined);
  const entries = [...new Set([...scripts, ...modulePreloads])];
  entrypointPresent = scripts.length > 0 ? 1 : 0;

  for (const entry of entries) {
    const content = readFileSync(resolve(dist, entry.replace(/^\//, "")));
    initialJsBytes += content.byteLength;
    initialJsGzipBytes += gzipSync(content).byteLength;
  }

  for (const file of readdirSync(resolve(dist, "assets"))) {
    if (!file.endsWith(".js")) continue;
    const bytes = statSync(resolve(dist, "assets", file)).size;
    totalJsBytes += bytes;
    largestJsBytes = Math.max(largestJsBytes, bytes);
  }
}

console.log(
  JSON.stringify({
    build_passed: result.status === 0 ? 1 : 0,
    entrypoint_present: entrypointPresent,
    initial_js_bytes: initialJsBytes,
    initial_js_gzip_bytes: initialJsGzipBytes,
    total_js_bytes: totalJsBytes,
    largest_js_bytes: largestJsBytes,
    ineffective_dynamic_import_warnings: (
      buildOutput.match(/INEFFECTIVE_DYNAMIC_IMPORT/g) ?? []
    ).length
  })
);

if (result.status !== 0) process.exitCode = result.status ?? 1;
