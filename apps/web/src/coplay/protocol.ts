/**
 * Local co-play wire protocol (BroadcastChannel today; Realtime later).
 * Versioned payloads so Supabase/Colyseus adapters can reuse the same shapes.
 */

import { parseCursorPayload, type CursorPayloadV1 } from "./cursorPresence";
import { isRpsThrow, type RpsThrow, type RpsWinner } from "./rpsRules";

export type CoPlayRole = "host" | "guest";

export interface StoryMirrorPayloadV1 {
  readonly version: 1;
  readonly kind: "story";
  readonly sceneId: string | null;
  readonly sceneTitle: string;
  readonly speaker: string;
  readonly text: string;
  readonly isComplete: boolean;
  readonly isEnded: boolean;
  readonly choices: readonly { readonly index: number; readonly text: string }[];
  readonly mianzi: number;
  readonly ai_score: number;
  readonly aiMode: boolean;
  readonly hostAlias: string;
  readonly updatedAtMs: number;
}

export interface VotePayloadV1 {
  readonly version: 1;
  readonly kind: "vote";
  readonly playerId: string;
  readonly alias: string;
  readonly choiceIndex: number;
  readonly choiceText: string;
  readonly sceneId: string | null;
  readonly updatedAtMs: number;
}

export interface HelloPayloadV1 {
  readonly version: 1;
  readonly kind: "hello";
  readonly playerId: string;
  readonly alias: string;
  readonly role: CoPlayRole;
  readonly updatedAtMs: number;
}

export interface RpsOpenPayloadV1 {
  readonly version: 1;
  readonly kind: "rps_open";
  readonly duelId: string;
  readonly sceneId: string | null;
  readonly hostChoiceIndex: number;
  readonly hostChoiceText: string;
  readonly guestChoiceIndex: number;
  readonly guestChoiceText: string;
  readonly guestPlayerId: string;
  readonly updatedAtMs: number;
}

export interface RpsThrowPayloadV1 {
  readonly version: 1;
  readonly kind: "rps_throw";
  readonly duelId: string;
  readonly playerId: string;
  readonly throw: RpsThrow;
  readonly updatedAtMs: number;
}

export interface RpsResultPayloadV1 {
  readonly version: 1;
  readonly kind: "rps_result";
  readonly duelId: string;
  readonly hostThrow: RpsThrow;
  readonly guestThrow: RpsThrow;
  readonly winner: RpsWinner;
  readonly winningChoiceIndex: number | null;
  readonly updatedAtMs: number;
}

/** Host accepted global-echo referee instead of finishing RPS throws. */
export interface RpsGlobalPickPayloadV1 {
  readonly version: 1;
  readonly kind: "rps_global_pick";
  readonly duelId: string;
  readonly winningChoiceIndex: number;
  readonly note: string;
  readonly updatedAtMs: number;
}

export type CoPlayKindPayload =
  | StoryMirrorPayloadV1
  | VotePayloadV1
  | HelloPayloadV1
  | RpsOpenPayloadV1
  | RpsThrowPayloadV1
  | RpsResultPayloadV1
  | RpsGlobalPickPayloadV1;

export interface CoPlayEnvelope {
  readonly roomCode: string;
  readonly fromPlayerId: string;
  readonly payload: CursorPayloadV1 | CoPlayKindPayload;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function makeRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]!;
  }
  return code;
}

export function normalizeRoomCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

export function makePlayerId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeDuelId(): string {
  return `duel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function channelNameForRoom(roomCode: string): string {
  return `supaluv-coplay-v1:${normalizeRoomCode(roomCode)}`;
}

export function parseEnvelope(value: unknown): CoPlayEnvelope | null {
  if (!isRecord(value)) {
    return null;
  }
  if (typeof value.roomCode !== "string" || typeof value.fromPlayerId !== "string") {
    return null;
  }
  const payload = value.payload;
  if (!isRecord(payload) || payload.version !== 1 || typeof payload.kind !== "string") {
    const cursor = parseCursorPayload(payload);
    if (cursor) {
      return {
        roomCode: normalizeRoomCode(value.roomCode),
        fromPlayerId: value.fromPlayerId,
        payload: cursor,
      };
    }
    return null;
  }

  const roomCode = normalizeRoomCode(value.roomCode);
  const fromPlayerId = value.fromPlayerId;

  if (payload.kind === "story") {
    if (typeof payload.speaker !== "string" || typeof payload.text !== "string") {
      return null;
    }
    if (typeof payload.isComplete !== "boolean" || typeof payload.isEnded !== "boolean") {
      return null;
    }
    if (!Array.isArray(payload.choices)) {
      return null;
    }
    const choices = payload.choices
      .map((c) => {
        if (!isRecord(c) || typeof c.index !== "number" || typeof c.text !== "string") {
          return null;
        }
        return { index: c.index, text: c.text };
      })
      .filter((c): c is { index: number; text: string } => c !== null);
    return {
      roomCode,
      fromPlayerId,
      payload: {
        version: 1,
        kind: "story",
        sceneId:
          typeof payload.sceneId === "string" || payload.sceneId === null ? payload.sceneId : null,
        sceneTitle: typeof payload.sceneTitle === "string" ? payload.sceneTitle : "",
        speaker: payload.speaker,
        text: payload.text,
        isComplete: payload.isComplete,
        isEnded: payload.isEnded,
        choices,
        mianzi:
          typeof payload.mianzi === "number"
            ? payload.mianzi
            : typeof (payload as { dignity?: number }).dignity === "number"
              ? (payload as { dignity: number }).dignity
              : 50,
        ai_score:
          typeof payload.ai_score === "number"
            ? payload.ai_score
            : typeof (payload as { impulse?: number }).impulse === "number"
              ? (payload as { impulse: number }).impulse
              : 50,
        aiMode: Boolean(payload.aiMode),
        hostAlias: typeof payload.hostAlias === "string" ? payload.hostAlias : "房主",
        updatedAtMs: typeof payload.updatedAtMs === "number" ? payload.updatedAtMs : Date.now(),
      },
    };
  }

  if (payload.kind === "vote") {
    if (typeof payload.playerId !== "string" || typeof payload.alias !== "string") {
      return null;
    }
    if (typeof payload.choiceIndex !== "number" || typeof payload.choiceText !== "string") {
      return null;
    }
    return {
      roomCode,
      fromPlayerId,
      payload: {
        version: 1,
        kind: "vote",
        playerId: payload.playerId,
        alias: payload.alias,
        choiceIndex: payload.choiceIndex,
        choiceText: payload.choiceText,
        sceneId:
          typeof payload.sceneId === "string" || payload.sceneId === null ? payload.sceneId : null,
        updatedAtMs: typeof payload.updatedAtMs === "number" ? payload.updatedAtMs : Date.now(),
      },
    };
  }

  if (payload.kind === "hello") {
    if (typeof payload.playerId !== "string" || typeof payload.alias !== "string") {
      return null;
    }
    if (payload.role !== "host" && payload.role !== "guest") {
      return null;
    }
    return {
      roomCode,
      fromPlayerId,
      payload: {
        version: 1,
        kind: "hello",
        playerId: payload.playerId,
        alias: payload.alias,
        role: payload.role,
        updatedAtMs: typeof payload.updatedAtMs === "number" ? payload.updatedAtMs : Date.now(),
      },
    };
  }

  if (payload.kind === "rps_open") {
    if (typeof payload.duelId !== "string") {
      return null;
    }
    if (
      typeof payload.hostChoiceIndex !== "number" ||
      typeof payload.guestChoiceIndex !== "number" ||
      typeof payload.hostChoiceText !== "string" ||
      typeof payload.guestChoiceText !== "string" ||
      typeof payload.guestPlayerId !== "string"
    ) {
      return null;
    }
    return {
      roomCode,
      fromPlayerId,
      payload: {
        version: 1,
        kind: "rps_open",
        duelId: payload.duelId,
        sceneId:
          typeof payload.sceneId === "string" || payload.sceneId === null ? payload.sceneId : null,
        hostChoiceIndex: payload.hostChoiceIndex,
        hostChoiceText: payload.hostChoiceText,
        guestChoiceIndex: payload.guestChoiceIndex,
        guestChoiceText: payload.guestChoiceText,
        guestPlayerId: payload.guestPlayerId,
        updatedAtMs: typeof payload.updatedAtMs === "number" ? payload.updatedAtMs : Date.now(),
      },
    };
  }

  if (payload.kind === "rps_throw") {
    if (typeof payload.duelId !== "string" || typeof payload.playerId !== "string") {
      return null;
    }
    if (!isRpsThrow(payload.throw)) {
      return null;
    }
    return {
      roomCode,
      fromPlayerId,
      payload: {
        version: 1,
        kind: "rps_throw",
        duelId: payload.duelId,
        playerId: payload.playerId,
        throw: payload.throw,
        updatedAtMs: typeof payload.updatedAtMs === "number" ? payload.updatedAtMs : Date.now(),
      },
    };
  }

  if (payload.kind === "rps_result") {
    if (typeof payload.duelId !== "string") {
      return null;
    }
    if (!isRpsThrow(payload.hostThrow) || !isRpsThrow(payload.guestThrow)) {
      return null;
    }
    if (payload.winner !== "host" && payload.winner !== "guest" && payload.winner !== "draw") {
      return null;
    }
    return {
      roomCode,
      fromPlayerId,
      payload: {
        version: 1,
        kind: "rps_result",
        duelId: payload.duelId,
        hostThrow: payload.hostThrow,
        guestThrow: payload.guestThrow,
        winner: payload.winner,
        winningChoiceIndex:
          typeof payload.winningChoiceIndex === "number" || payload.winningChoiceIndex === null
            ? payload.winningChoiceIndex
            : null,
        updatedAtMs: typeof payload.updatedAtMs === "number" ? payload.updatedAtMs : Date.now(),
      },
    };
  }

  if (payload.kind === "rps_global_pick") {
    if (typeof payload.duelId !== "string") {
      return null;
    }
    if (typeof payload.winningChoiceIndex !== "number") {
      return null;
    }
    return {
      roomCode,
      fromPlayerId,
      payload: {
        version: 1,
        kind: "rps_global_pick",
        duelId: payload.duelId,
        winningChoiceIndex: payload.winningChoiceIndex,
        note: typeof payload.note === "string" ? payload.note : "全球回声裁判",
        updatedAtMs: typeof payload.updatedAtMs === "number" ? payload.updatedAtMs : Date.now(),
      },
    };
  }

  return null;
}
