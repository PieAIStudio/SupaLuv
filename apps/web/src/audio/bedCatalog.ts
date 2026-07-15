/**
 * Human-facing bed catalog for HUD / gallery.
 * Runtime still uses stable kebab ids under /assets/audio/bgm/.
 */

export interface BedCatalogEntry {
  readonly id: string;
  readonly title: string;
  /** Short role for HUD. */
  readonly role: string;
  readonly kind: "music" | "ambient";
}

type BedLocale = string | undefined;

const ENGLISH_ROLES: Readonly<Record<string, string>> = {
  "title-theme": "Title theme",
  "soft-piano": "Dialogue melody",
  "chapter-end": "Chapter-end afterglow",
  "night-ambient": "Office / public",
  "lonely-pad": "Apartment / private",
};

export const BED_CATALOG: readonly BedCatalogEntry[] = [
  {
    id: "title-theme",
    title: "Ten Past Midnight",
    role: "标题主题",
    kind: "music",
  },
  {
    id: "soft-piano",
    title: "Before the Last Train",
    role: "对话旋律",
    kind: "music",
  },
  {
    id: "chapter-end",
    title: "Last Train to Shibuya",
    role: "章末余韵",
    kind: "music",
  },
  {
    id: "night-ambient",
    title: "Behind the Glass",
    role: "办公室/公共",
    kind: "ambient",
  },
  {
    id: "lonely-pad",
    title: "Half Empty Teacups",
    role: "公寓/私密",
    kind: "ambient",
  },
] as const;

const BY_ID = new Map(BED_CATALOG.map((entry) => [entry.id, entry]));

export function bedTitle(id: string | null | undefined): string {
  if (!id) {
    return "—";
  }
  return BY_ID.get(id)?.title ?? id;
}

export function bedRole(id: string | null | undefined, locale: BedLocale = "zh-CN"): string {
  if (!id) {
    return "";
  }
  if (locale && !locale.toLowerCase().startsWith("zh")) {
    return ENGLISH_ROLES[id] ?? "";
  }
  return BY_ID.get(id)?.role ?? "";
}

export function bedLabel(id: string | null | undefined, locale: BedLocale = "zh-CN"): string {
  if (!id) {
    return locale && !locale.toLowerCase().startsWith("zh") ? "Muted" : "静音";
  }
  const entry = BY_ID.get(id);
  if (!entry) {
    return id;
  }
  return `${entry.title} · ${bedRole(id, locale)}`;
}
