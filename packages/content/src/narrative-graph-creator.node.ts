/**
 * Node/dev-only NarrativeGraph creator loader.
 *
 * Do not import from production web entrypoints, Vite client code, or any
 * module that ships in the player bundle. Tests and local tooling only.
 *
 * The filename suffix `.node` documents the boundary; a unit test asserts the
 * normal production content graph does not import this module.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NarrativeGraphCreator } from "@supaluv/shared/narrative-graph";

const CREATOR_JSON_REL = "../generated/narrative-graph-creator.json";

export function loadNarrativeGraphCreator(): NarrativeGraphCreator {
  const here = dirname(fileURLToPath(import.meta.url));
  const abs = resolve(here, CREATOR_JSON_REL);
  const raw = readFileSync(abs, "utf8");
  return JSON.parse(raw) as NarrativeGraphCreator;
}

export function getNarrativeGraphCreatorPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, CREATOR_JSON_REL);
}
