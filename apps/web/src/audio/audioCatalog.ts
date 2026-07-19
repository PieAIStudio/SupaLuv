/**
 * Release audio catalog.
 *
 * Runtime callers resolve only these stable IDs. Missing authored assets are a
 * clean no-op instead of an invented `/assets/audio/...` URL.
 */

export type AudioBedKind = "music" | "ambient";
export type AudioRepeatPolicy = "overlap" | "restart";

export interface AudioBedCatalogEntry {
  readonly id: string;
  readonly kind: AudioBedKind;
  readonly src: string;
  readonly loop: true;
  readonly fadeInMs: number;
  readonly fadeOutMs: number;
}

export interface AudioSfxCatalogEntry {
  readonly id: string;
  readonly kind: "sfx";
  readonly src: string;
  readonly loop: false;
  readonly repeat: AudioRepeatPolicy;
  readonly sceneCue: boolean;
}

export const AUDIO_BED_CATALOG = [
  {
    id: "title-theme",
    kind: "music",
    src: "/assets/audio/bgm/title-theme.mp3",
    loop: true,
    fadeInMs: 550,
    fadeOutMs: 700,
  },
  {
    id: "soft-piano",
    kind: "music",
    src: "/assets/audio/bgm/soft-piano.mp3",
    loop: true,
    fadeInMs: 500,
    fadeOutMs: 700,
  },
  {
    id: "chapter-end",
    kind: "music",
    src: "/assets/audio/bgm/chapter-end.mp3",
    loop: true,
    fadeInMs: 800,
    fadeOutMs: 900,
  },
  {
    id: "night-ambient",
    kind: "ambient",
    src: "/assets/audio/bgm/night-ambient.mp3",
    loop: true,
    fadeInMs: 650,
    fadeOutMs: 700,
  },
  {
    id: "lonely-pad",
    kind: "ambient",
    src: "/assets/audio/bgm/lonely-pad.mp3",
    loop: true,
    fadeInMs: 700,
    fadeOutMs: 800,
  },
  {
    id: "empty-floor",
    kind: "ambient",
    src: "/assets/audio/bgm/empty-floor.mp3",
    loop: true,
    fadeInMs: 650,
    fadeOutMs: 750,
  },
  {
    id: "under-floorboards",
    kind: "ambient",
    src: "/assets/audio/bgm/under-floorboards.mp3",
    loop: true,
    fadeInMs: 550,
    fadeOutMs: 700,
  },
] as const satisfies readonly AudioBedCatalogEntry[];

export const AUDIO_SFX_CATALOG = [
  {
    id: "ui-click",
    kind: "sfx",
    src: "/assets/audio/sfx/ui-click.mp3",
    loop: false,
    repeat: "overlap",
    sceneCue: false,
  },
  {
    id: "ui-choice",
    kind: "sfx",
    src: "/assets/audio/sfx/ui-choice.mp3",
    loop: false,
    repeat: "overlap",
    sceneCue: false,
  },
  {
    id: "notify-soft",
    kind: "sfx",
    src: "/assets/audio/sfx/notify-soft.mp3",
    loop: false,
    repeat: "restart",
    sceneCue: true,
  },
  {
    id: "payment-chime",
    kind: "sfx",
    src: "/assets/audio/sfx/payment-chime.mp3",
    loop: false,
    repeat: "restart",
    sceneCue: true,
  },
] as const satisfies readonly AudioSfxCatalogEntry[];

export type AudioBedId = (typeof AUDIO_BED_CATALOG)[number]["id"];
export type AudioSfxId = (typeof AUDIO_SFX_CATALOG)[number]["id"];

const BED_BY_ID = new Map<string, AudioBedCatalogEntry>(
  AUDIO_BED_CATALOG.map((entry) => [entry.id, entry]),
);
const SFX_BY_ID = new Map<string, AudioSfxCatalogEntry>(
  AUDIO_SFX_CATALOG.map((entry) => [entry.id, entry]),
);

export function resolveBedCatalogEntry(id: string | null | undefined): AudioBedCatalogEntry | null {
  if (!id) {
    return null;
  }
  return BED_BY_ID.get(id) ?? null;
}

export function resolveSfxCatalogEntry(id: string | null | undefined): AudioSfxCatalogEntry | null {
  if (!id) {
    return null;
  }
  return SFX_BY_ID.get(id) ?? null;
}

export function listAudioCatalogIds(): {
  readonly beds: readonly AudioBedId[];
  readonly sfx: readonly AudioSfxId[];
} {
  return {
    beds: AUDIO_BED_CATALOG.map((entry) => entry.id),
    sfx: AUDIO_SFX_CATALOG.map((entry) => entry.id),
  };
}
