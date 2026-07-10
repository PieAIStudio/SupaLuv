/**
 * E19 — player display names for the two lead slots only.
 * Logical IDs stay suming / lin_xiaotang; Ink still uses 苏明 / 林晓棠.
 * UI nameplates, history, share cards resolve through this map.
 */

const STORAGE_KEY = "supaluv.displayNames.v1";

export type LeadSlotId = "suming" | "lin_xiaotang";

export interface DisplayNameMap {
  readonly suming: string;
  readonly lin_xiaotang: string;
}

export const DEFAULT_DISPLAY_NAMES: DisplayNameMap = {
  suming: "苏明",
  lin_xiaotang: "林晓棠",
};

/** Canonical authored names (Ink / registry). */
const CANONICAL: Readonly<Record<LeadSlotId, string>> = {
  suming: "苏明",
  lin_xiaotang: "林晓棠",
};

const MAX_LEN = 12;

export function sanitizeDisplayName(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") {
    return fallback;
  }
  const trimmed = raw.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return fallback;
  }
  // Block control chars / path-ish junk; keep CJK + common punctuation.
  const cleaned = [...trimmed]
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      if (code < 0x20 || code === 0x7f) {
        return false;
      }
      return !"/\\<>".includes(ch);
    })
    .join("");
  if (!cleaned) {
    return fallback;
  }
  return cleaned.slice(0, MAX_LEN);
}

export function loadDisplayNames(): DisplayNameMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_DISPLAY_NAMES;
    }
    const parsed = JSON.parse(raw) as Partial<DisplayNameMap>;
    return {
      suming: sanitizeDisplayName(parsed.suming, DEFAULT_DISPLAY_NAMES.suming),
      lin_xiaotang: sanitizeDisplayName(parsed.lin_xiaotang, DEFAULT_DISPLAY_NAMES.lin_xiaotang),
    };
  } catch {
    return DEFAULT_DISPLAY_NAMES;
  }
}

export function saveDisplayNames(names: DisplayNameMap): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      suming: sanitizeDisplayName(names.suming, DEFAULT_DISPLAY_NAMES.suming),
      lin_xiaotang: sanitizeDisplayName(names.lin_xiaotang, DEFAULT_DISPLAY_NAMES.lin_xiaotang),
    }),
  );
}

export function resetDisplayNames(): DisplayNameMap {
  saveDisplayNames(DEFAULT_DISPLAY_NAMES);
  return DEFAULT_DISPLAY_NAMES;
}

/**
 * Map an authored speaker string (or known alias) to the player's display name.
 * Non-leads pass through unchanged.
 */
export function resolveDisplaySpeaker(speaker: string, names: DisplayNameMap): string {
  if (!speaker) {
    return speaker;
  }
  if (speaker === CANONICAL.suming || speaker === "suming") {
    return names.suming || CANONICAL.suming;
  }
  if (speaker === CANONICAL.lin_xiaotang || speaker === "lin_xiaotang") {
    return names.lin_xiaotang || CANONICAL.lin_xiaotang;
  }
  // If player already renamed and history stored the custom name, keep it.
  if (speaker === names.suming) {
    return names.suming;
  }
  if (speaker === names.lin_xiaotang) {
    return names.lin_xiaotang;
  }
  return speaker;
}

/**
 * Optional body-text token replace for canonical lead names only.
 * Uses whole-token style on CJK (no word boundaries) — exact substring of 苏明/林晓棠.
 */
export function applyDisplayNamesInText(text: string, names: DisplayNameMap): string {
  if (!text) {
    return text;
  }
  let out = text;
  if (names.suming !== CANONICAL.suming) {
    out = out.split(CANONICAL.suming).join(names.suming);
  }
  if (names.lin_xiaotang !== CANONICAL.lin_xiaotang) {
    out = out.split(CANONICAL.lin_xiaotang).join(names.lin_xiaotang);
  }
  return out;
}
