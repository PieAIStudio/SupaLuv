/**
 * 2D stage cursor presence — adapted from TuringPact world-presence domain.
 * Coordinates are normalized 0–1 relative to the 16:9 stage (not screen pixels).
 * Presentation-only: never drives story authority.
 */

export interface CursorPayloadV1 {
  readonly version: 1;
  readonly playerId: string;
  readonly alias: string;
  readonly xNorm: number;
  readonly yNorm: number;
  readonly isHost: boolean;
  readonly updatedAtMs: number;
}

export interface RemoteCursorState {
  readonly playerId: string;
  readonly current: CursorPayloadV1;
  readonly previousX: number;
  readonly previousY: number;
  readonly lastReceivedAtMs: number;
  readonly intervalMs: number;
  readonly missingSinceMs: number | null;
}

/** Render-ready remote cursor after interpolation. */
export interface InterpolatedCursor {
  readonly playerId: string;
  readonly alias: string;
  readonly isHost: boolean;
  readonly xNorm: number;
  readonly yNorm: number;
}

const DEFAULT_MIN_INTERVAL_MS = 120;
const DEFAULT_MIN_MOVE = 0.012;
const DEFAULT_REMOTE_INTERVAL_MS = 120;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function createCursorPayload(input: {
  readonly playerId: string;
  readonly alias: string;
  readonly xNorm: number;
  readonly yNorm: number;
  readonly isHost: boolean;
  readonly updatedAtMs: number;
}): CursorPayloadV1 {
  return {
    version: 1,
    playerId: input.playerId,
    alias: input.alias.slice(0, 16) || "玩家",
    xNorm: clamp01(input.xNorm),
    yNorm: clamp01(input.yNorm),
    isHost: input.isHost,
    updatedAtMs: input.updatedAtMs,
  };
}

export function parseCursorPayload(value: unknown): CursorPayloadV1 | null {
  if (!isRecord(value)) {
    return null;
  }
  if (value.version !== 1) {
    return null;
  }
  if (typeof value.playerId !== "string" || value.playerId.trim().length === 0) {
    return null;
  }
  if (typeof value.alias !== "string" || value.alias.trim().length === 0) {
    return null;
  }
  if (!isFiniteNumber(value.xNorm) || !isFiniteNumber(value.yNorm)) {
    return null;
  }
  if (!isFiniteNumber(value.updatedAtMs) || value.updatedAtMs < 0) {
    return null;
  }
  if (typeof value.isHost !== "boolean") {
    return null;
  }
  return createCursorPayload({
    playerId: value.playerId,
    alias: value.alias,
    xNorm: value.xNorm,
    yNorm: value.yNorm,
    isHost: value.isHost,
    updatedAtMs: value.updatedAtMs,
  });
}

export function shouldPublishCursor(input: {
  readonly next: CursorPayloadV1;
  readonly previous: CursorPayloadV1 | null;
  readonly nowMs: number;
  readonly minIntervalMs?: number;
  readonly minMove?: number;
}): boolean {
  const minIntervalMs = input.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS;
  const minMove = input.minMove ?? DEFAULT_MIN_MOVE;
  const { next, previous, nowMs } = input;
  if (!previous) {
    return true;
  }
  if (next.playerId !== previous.playerId) {
    return true;
  }
  const dist = Math.hypot(next.xNorm - previous.xNorm, next.yNorm - previous.yNorm);
  if (dist >= minMove) {
    return true;
  }
  return nowMs - previous.updatedAtMs >= minIntervalMs;
}

export function applyRemoteCursorUpdate(input: {
  readonly nowMs: number;
  readonly payload: CursorPayloadV1;
  readonly previous: RemoteCursorState | null;
}): RemoteCursorState {
  const { nowMs, payload, previous } = input;
  if (!previous || previous.playerId !== payload.playerId) {
    return {
      playerId: payload.playerId,
      current: payload,
      previousX: payload.xNorm,
      previousY: payload.yNorm,
      lastReceivedAtMs: nowMs,
      intervalMs: DEFAULT_REMOTE_INTERVAL_MS,
      missingSinceMs: null,
    };
  }
  const elapsed = Math.max(0, nowMs - previous.lastReceivedAtMs);
  const intervalMs =
    elapsed > 5 && elapsed < 450 ? previous.intervalMs * 0.7 + elapsed * 0.3 : previous.intervalMs;
  const amount = Math.min(1.25, elapsed / Math.max(20, previous.intervalMs));
  return {
    playerId: payload.playerId,
    current: payload,
    previousX:
      previous.previousX + (previous.current.xNorm - previous.previousX) * Math.min(1, amount),
    previousY:
      previous.previousY + (previous.current.yNorm - previous.previousY) * Math.min(1, amount),
    lastReceivedAtMs: nowMs,
    intervalMs,
    missingSinceMs: null,
  };
}

export function interpolateRemoteCursor(input: {
  readonly nowMs: number;
  readonly state: RemoteCursorState;
}): InterpolatedCursor {
  const { nowMs, state } = input;
  const amount = Math.min(
    1.25,
    Math.max(0, nowMs - state.lastReceivedAtMs) / Math.max(20, state.intervalMs),
  );
  return {
    playerId: state.playerId,
    alias: state.current.alias,
    isHost: state.current.isHost,
    xNorm: state.previousX + (state.current.xNorm - state.previousX) * Math.min(1, amount),
    yNorm: state.previousY + (state.current.yNorm - state.previousY) * Math.min(1, amount),
  };
}

export function pruneStaleRemoteCursors(input: {
  readonly nowMs: number;
  readonly staleAfterMs: number;
  readonly states: ReadonlyMap<string, RemoteCursorState>;
}): Map<string, RemoteCursorState> {
  const fresh = new Map<string, RemoteCursorState>();
  for (const [playerId, state] of input.states) {
    const last = state.lastReceivedAtMs;
    if (input.nowMs - last <= input.staleAfterMs) {
      fresh.set(playerId, state);
    }
  }
  return fresh;
}

export function mergeRemoteCursorPayloads(input: {
  readonly nowMs: number;
  readonly payloads: readonly CursorPayloadV1[];
  readonly states: ReadonlyMap<string, RemoteCursorState>;
}): Map<string, RemoteCursorState> {
  const merged = new Map(input.states);
  for (const payload of input.payloads) {
    merged.set(
      payload.playerId,
      applyRemoteCursorUpdate({
        nowMs: input.nowMs,
        payload,
        previous: merged.get(payload.playerId) ?? null,
      }),
    );
  }
  return merged;
}
