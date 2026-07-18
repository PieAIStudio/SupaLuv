/**
 * Minimum-dwell contract for the loading experience.
 *
 * Fast loads used to flash the loading visual for a few hundred ms — too short
 * to read, which feels broken. The overlay itself cannot delay its own unmount
 * (it is usually a Suspense fallback), so it reports reveal/unmount here and an
 * always-mounted curtain keeps the SAME visual on screen until the minimum
 * dwell has passed. Loads that finish inside the pre-reveal shield window never
 * revealed anything, so they owe no dwell and stay instant.
 */

export const LOADING_MIN_DWELL_MS = 2000;

export interface DwellHold {
  readonly kind: string;
  readonly posterSrc: string | null;
  /** Epoch ms when the hold should end. */
  readonly until: number;
}

type Listener = (hold: DwellHold | null) => void;

let revealedAt: number | null = null;
let revealedKind: string | null = null;
let revealedPoster: string | null = null;
let currentHold: DwellHold | null = null;
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) {
    listener(currentHold);
  }
}

/** Overlay reports that its visual actually became visible. */
export function reportLoadingRevealed(kind: string, posterSrc: string | null): void {
  revealedAt = Date.now();
  revealedKind = kind;
  revealedPoster = posterSrc;
  // A newly revealed overlay supersedes any pending hold from a previous load.
  if (currentHold) {
    currentHold = null;
    emit();
  }
}

/** Overlay reports unmount. Starts a curtain hold if the dwell is unmet. */
export function reportLoadingUnmounted(): void {
  if (revealedAt === null || revealedKind === null) {
    return;
  }
  const elapsed = Date.now() - revealedAt;
  const remaining = LOADING_MIN_DWELL_MS - elapsed;
  const kind = revealedKind;
  const poster = revealedPoster;
  revealedAt = null;
  revealedKind = null;
  revealedPoster = null;
  if (remaining <= 0) {
    return;
  }
  currentHold = { kind, posterSrc: poster, until: Date.now() + remaining };
  emit();
}

/** Error states show actionable UI, not a dwell visual — forget the reveal. */
export function cancelLoadingReveal(): void {
  revealedAt = null;
  revealedKind = null;
  revealedPoster = null;
}

export function clearLoadingHold(): void {
  if (currentHold) {
    currentHold = null;
    emit();
  }
}

export function getLoadingHold(): DwellHold | null {
  return currentHold;
}

export function subscribeLoadingHold(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test/HMR hygiene. */
export function resetLoadingDwellForTests(): void {
  revealedAt = null;
  revealedKind = null;
  revealedPoster = null;
  currentHold = null;
}
