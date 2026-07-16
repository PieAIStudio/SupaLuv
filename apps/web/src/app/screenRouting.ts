/**
 * Screen routing types and pure meta-navigation helpers for the product shell.
 * Behavior-preserving extract from App.tsx — state machine ownership stays in App.
 */

export type AppScreen =
  | "title"
  | "character-studio"
  | "play"
  | "gallery"
  | "settings"
  | "help"
  | "achievements"
  | "ai-spend";

/** Meta screens that open from title or play and return via backFromMeta. */
export type MetaScreen = "gallery" | "settings" | "help" | "achievements" | "ai-spend";

/**
 * When opening a meta screen, remember whether we came from play or title.
 * Any non-play screen records title as the return target (exact pre-extract).
 */
export function captureMetaReturnScreen(current: AppScreen): AppScreen {
  return current === "play" ? "play" : "title";
}

/**
 * Resolve where backFromMeta should land.
 * Play is only restored when the return marker says play *and* a runner exists.
 */
export function resolveBackFromMeta(metaReturn: AppScreen, hasRunner: boolean): AppScreen {
  return metaReturn === "play" && hasRunner ? "play" : "title";
}
