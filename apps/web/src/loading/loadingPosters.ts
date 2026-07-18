/**
 * Loading-screen atmosphere posters (cinematic stills, no text in image).
 * Mood tags let each loading kind pull a poster that matches the emotional
 * temperature of the moment it interrupts — a breakup beat never gets a
 * slapstick poster. Files live in /assets/ui/loading/; missing files simply
 * mean "no poster", and the overlay falls back to the plain backdrop.
 */

export type PosterMood = "upbeat" | "tender" | "tense" | "melancholy" | "uncanny";

export interface LoadingPoster {
  readonly src: string;
  readonly mood: PosterMood;
}

export const LOADING_POSTERS: readonly LoadingPoster[] = [
  { src: "/assets/ui/loading/poster-01-upbeat.jpg", mood: "upbeat" },
  { src: "/assets/ui/loading/poster-02-upbeat.jpg", mood: "upbeat" },
  { src: "/assets/ui/loading/poster-03-tender.jpg", mood: "tender" },
  { src: "/assets/ui/loading/poster-04-tender.jpg", mood: "tender" },
  { src: "/assets/ui/loading/poster-05-tense.jpg", mood: "tense" },
  { src: "/assets/ui/loading/poster-06-tense.jpg", mood: "tense" },
  { src: "/assets/ui/loading/poster-07-melancholy.jpg", mood: "melancholy" },
  { src: "/assets/ui/loading/poster-08-melancholy.jpg", mood: "melancholy" },
  { src: "/assets/ui/loading/poster-09-uncanny.jpg", mood: "uncanny" },
  { src: "/assets/ui/loading/poster-10-uncanny.jpg", mood: "uncanny" },
];

/** Which emotional temperatures fit each loading moment. */
const KIND_MOODS: Record<string, readonly PosterMood[]> = {
  title: ["upbeat", "tense"],
  casting: ["uncanny", "upbeat"],
  story: ["melancholy", "tender"],
  chapter: ["tense", "melancholy", "tender"],
};

let rotation = Math.floor(Math.random() * 997);

/**
 * Pick a mood-appropriate poster for a loading kind, rotating between calls so
 * repeated loads within one session do not always show the same still.
 * Returns null for kinds that should keep the plain treatment (e.g. retry).
 */
export function pickLoadingPoster(kind: string): LoadingPoster | null {
  const moods = KIND_MOODS[kind];
  if (!moods || moods.length === 0) {
    return null;
  }
  const pool = LOADING_POSTERS.filter((poster) => moods.includes(poster.mood));
  if (pool.length === 0) {
    return null;
  }
  rotation += 1;
  return pool[rotation % pool.length] ?? null;
}
