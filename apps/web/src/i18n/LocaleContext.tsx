import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isAppLocale, lookupMessage, messagesFor } from "./catalog";
import type { AppLocale } from "./types";
import { en } from "./locales/en";
import { zhCN } from "./locales/zh-CN";

const STORAGE_KEY = "supaluv.locale.v1";

interface LocaleContextValue {
  readonly locale: AppLocale;
  readonly setLocale: (next: AppLocale) => void;
  readonly t: (path: string, fallback?: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function detectInitialLocale(): AppLocale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && isAppLocale(saved)) {
      return saved;
    }
  } catch {
    // ignore
  }
  const nav = typeof navigator !== "undefined" ? navigator.language : "zh-CN";
  if (nav.toLowerCase().startsWith("zh")) {
    return "zh-CN";
  }
  return "en";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(() => detectInitialLocale());

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
    document.documentElement.lang = next === "zh-CN" ? "zh-CN" : next;
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "zh-CN" ? "zh-CN" : locale;
  }, [locale]);

  const t = useCallback(
    (path: string, fallback?: string) => {
      const primary = messagesFor(locale);
      const fromPrimary = lookupMessage(primary, path);
      if (fromPrimary) {
        return fromPrimary;
      }
      // Fallback chain: en → zh-CN → path
      return lookupMessage(en, path) ?? lookupMessage(zhCN, path) ?? fallback ?? path;
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}
