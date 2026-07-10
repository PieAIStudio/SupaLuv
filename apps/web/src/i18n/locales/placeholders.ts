import type { AppLocale, MessageTree } from "../types";
import { en } from "./en";

/** Clone English as structural placeholder for not-yet-translated locales. */
function placeholder(tag: string): MessageTree {
  return {
    ...en,
    common: {
      ...(en.common as MessageTree),
      placeholderLocale: `[${tag}] UI not translated yet — showing English.`,
    },
  };
}

export const PLACEHOLDER_LOCALES: Partial<Record<AppLocale, MessageTree>> = {
  ja: placeholder("ja"),
  ko: placeholder("ko"),
  es: placeholder("es"),
  fr: placeholder("fr"),
  de: placeholder("de"),
  "pt-BR": placeholder("pt-BR"),
  id: placeholder("id"),
  ar: placeholder("ar"),
};
