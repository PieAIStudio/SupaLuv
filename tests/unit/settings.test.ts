import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  textSpeedToTypewriter,
} from "../../apps/web/src/persistence/settings";

beforeAll(() => {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      key: (index: number) => [...store.keys()][index] ?? null,
    },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  localStorage.clear();
});

describe("settings", () => {
  it("returns defaults when empty", () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings().autoPlay).toBe(false);
  });

  it("persists four audio channels", () => {
    saveSettings({
      masterMuted: false,
      musicVolume: 0.2,
      ambientVolume: 0.5,
      sfxVolume: 0.9,
      voiceVolume: 0.7,
      textSpeed: "fast",
      autoPlay: true,
    });
    expect(loadSettings().musicVolume).toBe(0.2);
    expect(loadSettings().ambientVolume).toBe(0.5);
    expect(loadSettings().sfxVolume).toBe(0.9);
    expect(loadSettings().voiceVolume).toBe(0.7);
  });

  it("migrates legacy bgmVolume into music + ambient", () => {
    localStorage.setItem(
      "supaluv.settings.v1",
      JSON.stringify({ bgmVolume: 0.6, textSpeed: "slow" }),
    );
    const loaded = loadSettings();
    expect(loaded.musicVolume).toBe(0.6);
    expect(loaded.ambientVolume).toBeCloseTo(0.51, 2);
    expect(loaded.textSpeed).toBe("slow");
  });

  it("maps text speed to typewriter cadence", () => {
    expect(textSpeedToTypewriter("slow").tickMs).toBeGreaterThan(
      textSpeedToTypewriter("normal").tickMs,
    );
  });
});
