import type { AppLocale, LocaleMeta, MessageTree } from "./types";
import { en } from "./locales/en";
import { PLACEHOLDER_LOCALES } from "./locales/placeholders";
import { zhCN } from "./locales/zh-CN";

export const LOCALE_META: readonly LocaleMeta[] = [
  { id: "zh-CN", nativeLabel: "简体中文", englishLabel: "Chinese", ready: true },
  { id: "en", nativeLabel: "English", englishLabel: "English", ready: true },
  { id: "ja", nativeLabel: "日本語", englishLabel: "Japanese", ready: false },
  { id: "ko", nativeLabel: "한국어", englishLabel: "Korean", ready: false },
  { id: "es", nativeLabel: "Español", englishLabel: "Spanish", ready: false },
  { id: "fr", nativeLabel: "Français", englishLabel: "French", ready: false },
  { id: "de", nativeLabel: "Deutsch", englishLabel: "German", ready: false },
  { id: "pt-BR", nativeLabel: "Português (BR)", englishLabel: "Portuguese", ready: false },
  { id: "id", nativeLabel: "Bahasa Indonesia", englishLabel: "Indonesian", ready: false },
  { id: "ar", nativeLabel: "العربية", englishLabel: "Arabic", ready: false },
];

const TABLES: Record<AppLocale, MessageTree> = {
  "zh-CN": zhCN,
  en,
  ja: PLACEHOLDER_LOCALES.ja!,
  ko: PLACEHOLDER_LOCALES.ko!,
  es: PLACEHOLDER_LOCALES.es!,
  fr: PLACEHOLDER_LOCALES.fr!,
  de: PLACEHOLDER_LOCALES.de!,
  "pt-BR": PLACEHOLDER_LOCALES["pt-BR"]!,
  id: PLACEHOLDER_LOCALES.id!,
  ar: PLACEHOLDER_LOCALES.ar!,
};

export function messagesFor(locale: AppLocale): MessageTree {
  return TABLES[locale] ?? en;
}

export function isAppLocale(value: string): value is AppLocale {
  return LOCALE_META.some((meta) => meta.id === value);
}

/** Resolve nested key like `settings.audio`. */
export function lookupMessage(tree: MessageTree, path: string): string | undefined {
  const parts = path.split(".");
  let node: string | MessageTree | undefined = tree;
  for (const part of parts) {
    if (!node || typeof node === "string") {
      return undefined;
    }
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}
