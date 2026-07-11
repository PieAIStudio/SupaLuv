import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const outputRoot = new URL("../.vercel/output/", import.meta.url);
const config = JSON.parse(readFileSync(new URL("config.json", outputRoot), "utf8"));

assert.ok(
  config.routes.some(
    (route) => route.destination?.service === "ai-branch" && route.destination?.type === "service",
  ),
  "Vercel output must route the public API to ai-branch",
);
assert.ok(
  config.routes.some(
    (route) => route.destination?.service === "web" && route.destination?.type === "service",
  ),
  "Vercel output must route the application shell to web",
);
assert.ok(
  existsSync(new URL("services/web/static/index.html", outputRoot)),
  "Vercel output must contain the web service entrypoint",
);
assert.ok(
  existsSync(new URL("services/ai-branch/functions/index.func/.vc-config.json", outputRoot)),
  "Vercel output must contain the ai-branch Node function",
);

console.log("Vercel Services output contract verified: web + ai-branch + routes");
