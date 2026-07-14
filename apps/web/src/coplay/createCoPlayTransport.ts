/**
 * Pick the best available transport for a room.
 * Prefer Realtime when configured (cross-device); else BroadcastChannel (local tabs).
 */

import { createBroadcastTransport } from "./broadcastTransport";
import { createRealtimeTransport, isRealtimeConfigured } from "./realtimeTransport";
import type { CoPlayTransport, CoPlayTransportKind } from "./transportTypes";

function forcedTransportKind(): CoPlayTransportKind | null {
  const value = (import.meta.env.VITE_SUPALUV_COPLAY_TRANSPORT ?? "").trim().toLowerCase();
  return value === "broadcast" || value === "realtime" ? value : null;
}

export function preferredTransportKind(): CoPlayTransportKind {
  const forced = forcedTransportKind();
  if (forced === "broadcast") {
    return "broadcast";
  }
  return isRealtimeConfigured() ? "realtime" : "broadcast";
}

export function createCoPlayTransport(roomCode: string): CoPlayTransport {
  if (forcedTransportKind() === "broadcast") {
    return createBroadcastTransport(roomCode);
  }
  if (isRealtimeConfigured()) {
    const realtime = createRealtimeTransport(roomCode);
    if (realtime) {
      return realtime;
    }
  }
  return createBroadcastTransport(roomCode);
}
