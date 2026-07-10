/**
 * Cross-device co-play via Supabase Realtime broadcast (TuringPact-style channel).
 * No room tables required — pure broadcast envelopes on topic `supaluv-coplay-v1:{code}`.
 * Falls back is handled by createCoPlayTransport when env is missing.
 */

import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { channelNameForRoom, parseEnvelope, type CoPlayEnvelope } from "./protocol";
import type { CoPlayTransport } from "./transportTypes";

const BROADCAST_EVENT = "coplay_envelope";

let sharedClient: SupabaseClient | null = null;

function readRealtimeEnv(): { url: string; key: string } | null {
  const url = (
    (import.meta.env.VITE_SWIMMER_CORE_SUPABASE_URL as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
    ""
  ).trim();
  const key = (
    (import.meta.env.VITE_SWIMMER_CORE_PUBLISHABLE_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
    ""
  ).trim();
  if (!url.startsWith("http") || !key) {
    return null;
  }
  return { url, key };
}

export function isRealtimeConfigured(): boolean {
  return readRealtimeEnv() !== null;
}

function getClient(): SupabaseClient | null {
  const env = readRealtimeEnv();
  if (!env) {
    return null;
  }
  if (!sharedClient) {
    sharedClient = createClient(env.url, env.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return sharedClient;
}

export function createRealtimeTransport(roomCode: string): CoPlayTransport | null {
  const client = getClient();
  if (!client) {
    return null;
  }
  const topic = channelNameForRoom(roomCode);
  const handlers = new Set<(envelope: CoPlayEnvelope) => void>();
  let channel: RealtimeChannel | null = client.channel(topic, {
    config: { broadcast: { self: false } },
  });

  channel.on("broadcast", { event: BROADCAST_EVENT }, (msg) => {
    const envelope = parseEnvelope(msg.payload);
    if (!envelope) {
      return;
    }
    for (const handler of handlers) {
      handler(envelope);
    }
  });

  void channel.subscribe();

  return {
    kind: "realtime",
    roomCode: roomCode.toUpperCase(),
    post(envelope: CoPlayEnvelope) {
      void channel?.send({
        type: "broadcast",
        event: BROADCAST_EVENT,
        payload: envelope,
      });
    },
    subscribe(handler) {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },
    close() {
      handlers.clear();
      if (channel) {
        void client.removeChannel(channel);
        channel = null;
      }
    },
  };
}
