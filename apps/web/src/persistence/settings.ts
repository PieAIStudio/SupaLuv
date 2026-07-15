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

type SettingsRecord = Record<string, unknown>;

function isSettingsRecord(value: unknown): value is SettingsRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readVolume(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    return fallback;
  }
  return value;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readTextSpeed(
  value: unknown,
  fallback: GameSettings["textSpeed"],
): GameSettings["textSpeed"] {
  return value === "slow" || value === "normal" || value === "fast" ? value : fallback;
}

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }
    const candidate: unknown = JSON.parse(raw);
    if (!isSettingsRecord(candidate)) {
      return DEFAULT_SETTINGS;
    }

    // Migrations: masterVolume → all; bgmVolume → music + ambient split.
    const legacyMaster = readVolume(candidate.masterVolume, Number.NaN);
    const legacyBgm = readVolume(candidate.bgmVolume, Number.NaN);

    const musicFallback = Number.isFinite(legacyBgm)
      ? legacyBgm
      : Number.isFinite(legacyMaster)
        ? legacyMaster
        : DEFAULT_SETTINGS.musicVolume;
    const ambientFallback = Number.isFinite(legacyBgm)
      ? Math.min(1, legacyBgm * 0.85)
      : Number.isFinite(legacyMaster)
        ? legacyMaster
        : DEFAULT_SETTINGS.ambientVolume;
    const sfxFallback = Number.isFinite(legacyMaster) ? legacyMaster : DEFAULT_SETTINGS.sfxVolume;

    return {
      masterMuted: readBoolean(candidate.masterMuted, DEFAULT_SETTINGS.masterMuted),
      musicVolume: readVolume(candidate.musicVolume, musicFallback),
      ambientVolume: readVolume(candidate.ambientVolume, ambientFallback),
      sfxVolume: readVolume(candidate.sfxVolume, sfxFallback),
      voiceVolume: readVolume(candidate.voiceVolume, DEFAULT_SETTINGS.voiceVolume),
      textSpeed: readTextSpeed(candidate.textSpeed, DEFAULT_SETTINGS.textSpeed),
      autoPlay: readBoolean(candidate.autoPlay, DEFAULT_SETTINGS.autoPlay),
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
