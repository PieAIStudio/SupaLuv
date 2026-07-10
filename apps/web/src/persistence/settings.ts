const SETTINGS_KEY = "supaluv.settings.v1";

export interface GameSettings {
  readonly masterMuted: boolean;
  /** Melodic score / piano beds. */
  readonly musicVolume: number;
  /** Room / rain / pad environment beds. */
  readonly ambientVolume: number;
  /** UI and one-shot SFX. */
  readonly sfxVolume: number;
  /**
   * Character dialogue voice / VO (reserved).
   * Stored now so UI + saves are ready; no assets yet.
   */
  readonly voiceVolume: number;
  readonly textSpeed: "slow" | "normal" | "fast";
  readonly autoPlay: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  masterMuted: false,
  musicVolume: 0.38,
  ambientVolume: 0.3,
  sfxVolume: 0.72,
  voiceVolume: 0.8,
  textSpeed: "normal",
  autoPlay: false,
};

function clampVolume(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, n));
}

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw) as Partial<GameSettings> & {
      masterVolume?: number;
      bgmVolume?: number;
    };

    // Migrations: masterVolume → all; bgmVolume → music + ambient split.
    const legacyMaster = parsed.masterVolume;
    const legacyBgm = parsed.bgmVolume;

    const musicFallback =
      typeof legacyBgm === "number"
        ? legacyBgm
        : typeof legacyMaster === "number"
          ? legacyMaster
          : DEFAULT_SETTINGS.musicVolume;
    const ambientFallback =
      typeof legacyBgm === "number"
        ? Math.min(1, legacyBgm * 0.85)
        : typeof legacyMaster === "number"
          ? legacyMaster
          : DEFAULT_SETTINGS.ambientVolume;
    const sfxFallback =
      typeof legacyMaster === "number" ? legacyMaster : DEFAULT_SETTINGS.sfxVolume;

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      musicVolume: clampVolume(parsed.musicVolume ?? musicFallback, DEFAULT_SETTINGS.musicVolume),
      ambientVolume: clampVolume(
        parsed.ambientVolume ?? ambientFallback,
        DEFAULT_SETTINGS.ambientVolume,
      ),
      sfxVolume: clampVolume(parsed.sfxVolume ?? sfxFallback, DEFAULT_SETTINGS.sfxVolume),
      voiceVolume: clampVolume(
        parsed.voiceVolume ?? DEFAULT_SETTINGS.voiceVolume,
        DEFAULT_SETTINGS.voiceVolume,
      ),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: GameSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function textSpeedToTypewriter(speed: GameSettings["textSpeed"]): {
  charsPerTick: number;
  tickMs: number;
} {
  switch (speed) {
    case "slow":
      return { charsPerTick: 1, tickMs: 28 };
    case "fast":
      return { charsPerTick: 4, tickMs: 12 };
    default:
      return { charsPerTick: 2, tickMs: 18 };
  }
}
