/**
 * Pick the best available transport for a room.
 * Prefer Realtime when configured (cross-device); else BroadcastChannel (local tabs).
 */

import { createBroadcastTransport } from "./broadcastTransport";
import { createRealtimeTransport, isRealtimeConfigured } from "./realtimeTransport";
import type { CoPlayTransport, CoPlayTransportKind } from "./transportTypes";

export function preferredTransportKind(): CoPlayTransportKind {
  return isRealtimeConfigured() ? "realtime" : "broadcast";
}

export function createCoPlayTransport(roomCode: string): CoPlayTransport {
  if (isRealtimeConfigured()) {
    const realtime = createRealtimeTransport(roomCode);
    if (realtime) {
      return realtime;
    }
  }
  return createBroadcastTransport(roomCode);
}
