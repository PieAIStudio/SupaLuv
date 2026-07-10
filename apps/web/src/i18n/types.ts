export type AppLocale = "zh-CN" | "en" | "ja" | "ko" | "es" | "fr" | "de" | "pt-BR" | "id" | "ar";

export interface LocaleMeta {
  readonly id: AppLocale;
  readonly nativeLabel: string;
  readonly englishLabel: string;
  /** When false, UI falls back to English strings. */
  readonly ready: boolean;
}

export type MessageTree = {
  readonly [key: string]: string | MessageTree;
};
