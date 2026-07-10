/**
 * Local-tab co-play transport via BroadcastChannel.
 * Same origin, multi-tab demo.
 */

import { channelNameForRoom, parseEnvelope, type CoPlayEnvelope } from "./protocol";
import type { CoPlayTransport } from "./transportTypes";

export function createBroadcastTransport(roomCode: string): CoPlayTransport {
  const name = channelNameForRoom(roomCode);
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(name) : null;
  const handlers = new Set<(envelope: CoPlayEnvelope) => void>();

  function onMessage(event: MessageEvent) {
    const envelope = parseEnvelope(event.data);
    if (!envelope) {
      return;
    }
    for (const handler of handlers) {
      handler(envelope);
    }
  }

  channel?.addEventListener("message", onMessage);

  return {
    kind: "broadcast",
    roomCode: roomCode.toUpperCase(),
    post(envelope: CoPlayEnvelope) {
      channel?.postMessage(envelope);
    },
    subscribe(handler) {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },
    close() {
      handlers.clear();
      channel?.removeEventListener("message", onMessage);
      channel?.close();
    },
  };
}
