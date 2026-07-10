/**
 * Co-play wire transport contract.
 * BroadcastChannel (local tabs) and Supabase Realtime (cross-device) both implement this.
 */

import type { CoPlayEnvelope } from "./protocol";

export type CoPlayTransportKind = "broadcast" | "realtime";

export interface CoPlayTransport {
  readonly kind: CoPlayTransportKind;
  readonly roomCode: string;
  post(envelope: CoPlayEnvelope): void;
  subscribe(handler: (envelope: CoPlayEnvelope) => void): () => void;
  close(): void;
}
