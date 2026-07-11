/**
 * E20 — local portrait pack overrides for lead slots only.
 * Official assets always remain the fallback. No AI generation here.
 *
 * Storage: localStorage data URLs for up to a few resized images.
 * Keys are portrait stems (e.g. suming-shame) or lead slot wildcards.
 */

const STORAGE_KEY = "supaluv.portraitPack.v1";

export type LeadSlotId = "suming" | "lin_xiaotang";

export interface PortraitPackState {
  /** Exact stem → data URL or absolute path override. */
  readonly byStem: Readonly<Record<string, string>>;
  /**
   * Lead slot base override — applies to any stem starting with that prefix
   * when no exact stem match exists.
   */
  readonly byLead: Readonly<Partial<Record<LeadSlotId, string>>>;
}

export const EMPTY_PORTRAIT_PACK: PortraitPackState = {
  byStem: {},
  byLead: {},
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function loadPortraitPack(): PortraitPackState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return EMPTY_PORTRAIT_PACK;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return EMPTY_PORTRAIT_PACK;
    }
    const byStem: Record<string, string> = {};
    if (isRecord(parsed.byStem)) {
      for (const [k, v] of Object.entries(parsed.byStem)) {
        if (typeof v === "string" && v.startsWith("data:image/")) {
          byStem[k] = v;
        }
      }
    }
    const byLead: Partial<Record<LeadSlotId, string>> = {};
    if (isRecord(parsed.byLead)) {
      for (const slot of ["suming", "lin_xiaotang"] as const) {
        const v = parsed.byLead[slot];
        if (typeof v === "string" && v.startsWith("data:image/")) {
          byLead[slot] = v;
        }
      }
    }
    return { byStem, byLead };
  } catch {
    return EMPTY_PORTRAIT_PACK;
  }
}

export function savePortraitPack(pack: PortraitPackState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pack));
}

export function clearPortraitPack(): PortraitPackState {
  savePortraitPack(EMPTY_PORTRAIT_PACK);
  return EMPTY_PORTRAIT_PACK;
}

export function hasCustomPortraitPack(pack: PortraitPackState = loadPortraitPack()): boolean {
  return Object.keys(pack.byStem).length > 0 || Object.keys(pack.byLead).length > 0;
}

/** Map portrait stem → lead slot for wildcard override. */
export function leadSlotForStem(stem: string): LeadSlotId | null {
  if (stem.startsWith("suming")) {
    return "suming";
  }
  if (stem.startsWith("lin") || stem.startsWith("lin_xiaotang")) {
    return "lin_xiaotang";
  }
  return null;
}

/**
 * Resolve a portrait stem to a URL. Custom pack wins; else official public path.
 */
export function resolvePortraitUrl(
  stem: string,
  pack: PortraitPackState = loadPortraitPack(),
): string {
  if (pack.byStem[stem]) {
    return pack.byStem[stem]!;
  }
  const slot = leadSlotForStem(stem);
  if (slot && pack.byLead[slot]) {
    return pack.byLead[slot]!;
  }
  return `/assets/portraits/${stem}.png`;
}

/** Rewrite a full official portrait URL using the pack. */
export function rewritePortraitUrl(url: string, pack: PortraitPackState): string {
  const match = url.match(/\/assets\/portraits\/([^/?#]+)\.png$/);
  if (!match?.[1]) {
    return url;
  }
  return resolvePortraitUrl(match[1], pack);
}

/**
 * Read an image file, downscale to max edge, return PNG data URL.
 * Keeps localStorage under control.
 */
export async function fileToPortraitDataUrl(file: File, maxEdge = 512): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("请选择图片文件");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("图片过大（上限 8MB）");
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas 不可用");
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/png");
}

export function setLeadOverride(
  pack: PortraitPackState,
  slot: LeadSlotId,
  dataUrl: string,
): PortraitPackState {
  return {
    byStem: pack.byStem,
    byLead: { ...pack.byLead, [slot]: dataUrl },
  };
}

/**
 * Compatibility bridge for saves created before server character packs existed.
 * It snapshots only the old lead overrides; callers may persist the result in a new story run.
 */
export function legacyPortraitBindings(pack: PortraitPackState, lockedAt: string) {
  const bindings: Record<
    string,
    { slotId: string; packId: string; baseUrl: string; moodUrls: {}; lockedAt: string }
  > = {};
  const suming = pack.byLead.suming;
  if (suming) {
    bindings.lead_suming = {
      slotId: "lead_suming",
      packId: "legacy-local-suming",
      baseUrl: suming,
      moodUrls: {},
      lockedAt,
    };
  }
  const femaleLead = pack.byLead.lin_xiaotang;
  if (femaleLead) {
    bindings.lead_zhou_lu = {
      slotId: "lead_zhou_lu",
      packId: "legacy-local-female-lead",
      baseUrl: femaleLead,
      moodUrls: {},
      lockedAt,
    };
  }
  return bindings;
}
