import { resolveBedCatalogEntry, resolveSfxCatalogEntry, type AudioBedKind } from "../audioCatalog";
import type { GameBedKey } from "./runtime";

export function mimeToHowlerFormat(mime: string): string[] | undefined {
  const normalized = mime.toLowerCase();
  if (normalized.includes("mpeg") || normalized.includes("mp3")) {
    return ["mp3"];
  }
  if (normalized.includes("wav")) {
    return ["wav"];
  }
  if (normalized.includes("ogg")) {
    return ["ogg"];
  }
  if (normalized.includes("mp4") || normalized.includes("m4a") || normalized.includes("aac")) {
    return ["m4a"];
  }
  return undefined;
}

export function hasDedicatedKey(key: GameBedKey | null | undefined): boolean {
  return typeof key === "string" && key.length > 0;
}

export function isSceneCueSfx(key: string | null | undefined): boolean {
  return resolveSfxCatalogEntry(key)?.sceneCue ?? false;
}

export function classifyBed(key: string | null | undefined): AudioBedKind | null {
  return resolveBedCatalogEntry(key)?.kind ?? null;
}
