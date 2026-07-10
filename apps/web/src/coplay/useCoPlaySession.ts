import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRemoteCursorAnimation } from "../hooks/useRemoteCursorAnimation";
import { createCoPlayTransport } from "./createCoPlayTransport";
import {
  createCursorPayload,
  mergeRemoteCursorPayloads,
  parseCursorPayload,
  pruneStaleRemoteCursors,
  shouldPublishCursor,
  type CursorPayloadV1,
  type InterpolatedCursor,
  type RemoteCursorState,
} from "./cursorPresence";
import {
  makeDuelId,
  makePlayerId,
  type CoPlayRole,
  type RpsOpenPayloadV1,
  type RpsResultPayloadV1,
  type StoryMirrorPayloadV1,
  type VotePayloadV1,
} from "./protocol";
import type { RpsDuelView } from "./RpsDuelOverlay";
import { resolveRps, winningChoiceIndex, type RpsThrow } from "./rpsRules";
import { buildRpsView, type RpsDuelState } from "./rpsViewModel";
import type { CoPlayTransport, CoPlayTransportKind } from "./transportTypes";

export interface CoPlaySessionConfig {
  readonly roomCode: string;
  readonly role: CoPlayRole;
  readonly alias: string;
}

export type { InterpolatedCursor };

export type ActiveRpsDuel = RpsDuelState;

export interface CoPlaySessionApi {
  readonly roomCode: string;
  readonly role: CoPlayRole;
  readonly playerId: string;
  readonly alias: string;
  readonly transportKind: CoPlayTransportKind;
  readonly peerCount: number;
  readonly remoteCursors: readonly InterpolatedCursor[];
  readonly guestVotes: readonly VotePayloadV1[];
  readonly remoteStory: StoryMirrorPayloadV1 | null;
  readonly rpsDuel: ActiveRpsDuel | null;
  readonly rpsView: RpsDuelView | null;
  publishCursor: (xNorm: number, yNorm: number) => void;
  publishStory: (
    story: Omit<StoryMirrorPayloadV1, "version" | "kind" | "updatedAtMs" | "hostAlias">,
  ) => void;
  publishVote: (vote: { choiceIndex: number; choiceText: string; sceneId: string | null }) => void;
  clearVotes: () => void;
  openRpsDuel: (input: {
    sceneId: string | null;
    hostChoiceIndex: number;
    hostChoiceText: string;
    guestChoiceIndex: number;
    guestChoiceText: string;
    guestPlayerId: string;
  }) => void;
  publishRpsThrow: (value: RpsThrow) => void;
  /** Host: resolve conflict via global echo instead of RPS. */
  resolveRpsWithGlobal: (winningChoiceIndex: number, note: string) => void;
  clearRpsDuel: () => void;
  setOnRpsResolved: (cb: ((winningChoiceIndex: number) => void) | null) => void;
}

const STALE_MS = 4000;

export function useCoPlaySession(config: CoPlaySessionConfig | null): CoPlaySessionApi | null {
  const playerId = useMemo(() => makePlayerId(), []);
  const [remoteStates, setRemoteStates] = useState<Map<string, RemoteCursorState>>(() => new Map());
  const [guestVotes, setGuestVotes] = useState<VotePayloadV1[]>([]);
  const [remoteStory, setRemoteStory] = useState<StoryMirrorPayloadV1 | null>(null);
  const [peerCount, setPeerCount] = useState(0);
  const [rpsDuel, setRpsDuel] = useState<ActiveRpsDuel | null>(null);
  const [transportKind, setTransportKind] = useState<CoPlayTransportKind>("broadcast");
  const transportRef = useRef<CoPlayTransport | null>(null);
  const lastCursorRef = useRef<CursorPayloadV1 | null>(null);
  const peersRef = useRef(new Set<string>());
  const onRpsResolvedRef = useRef<((winningChoiceIndex: number) => void) | null>(null);
  const rpsDuelRef = useRef<ActiveRpsDuel | null>(null);

  useEffect(() => {
    rpsDuelRef.current = rpsDuel;
  }, [rpsDuel]);

  const finishWithWinner = useCallback(
    (winningIndex: number, delayMs: number) => {
      if (!config || config.role !== "host") {
        return;
      }
      window.setTimeout(() => {
        onRpsResolvedRef.current?.(winningIndex);
        setRpsDuel(null);
      }, delayMs);
    },
    [config],
  );

  const tryResolveRps = useCallback(
    (duel: ActiveRpsDuel, hostThrow: RpsThrow, guestThrow: RpsThrow) => {
      if (!config || !transportRef.current) {
        return;
      }
      const winner = resolveRps(hostThrow, guestThrow);
      const winIndex = winningChoiceIndex({
        winner,
        hostChoiceIndex: duel.open.hostChoiceIndex,
        guestChoiceIndex: duel.open.guestChoiceIndex,
      });
      const resultPayload: RpsResultPayloadV1 = {
        version: 1,
        kind: "rps_result",
        duelId: duel.open.duelId,
        hostThrow,
        guestThrow,
        winner,
        winningChoiceIndex: winIndex,
        updatedAtMs: Date.now(),
      };
      transportRef.current.post({
        roomCode: config.roomCode,
        fromPlayerId: playerId,
        payload: resultPayload,
      });
      setRpsDuel({
        ...duel,
        hostThrow,
        guestThrow,
        localThrow: config.role === "host" ? hostThrow : guestThrow,
        result: winner,
        globalNote: null,
      });
      if (winner === "draw") {
        window.setTimeout(() => {
          setRpsDuel((prev) =>
            prev && prev.open.duelId === duel.open.duelId
              ? {
                  open: prev.open,
                  localThrow: null,
                  hostThrow: null,
                  guestThrow: null,
                  result: "draw",
                  globalNote: null,
                }
              : prev,
          );
        }, 900);
        return;
      }
      if (winIndex !== null) {
        finishWithWinner(winIndex, 1000);
      }
    },
    [config, finishWithWinner, playerId],
  );

  useEffect(() => {
    if (!config) {
      return;
    }
    const transport = createCoPlayTransport(config.roomCode);
    transportRef.current = transport;
    setTransportKind(transport.kind);

    const unsub = transport.subscribe((envelope) => {
      if (envelope.fromPlayerId === playerId) {
        return;
      }
      const nowMs = Date.now();
      const { payload } = envelope;

      if ("kind" in payload) {
        if (payload.kind === "hello") {
          peersRef.current.add(payload.playerId);
          setPeerCount(peersRef.current.size);
          return;
        }
        if (payload.kind === "story" && config.role === "guest") {
          setRemoteStory(payload);
          return;
        }
        if (payload.kind === "vote" && config.role === "host") {
          setGuestVotes((prev) => {
            const without = prev.filter((v) => v.playerId !== payload.playerId);
            return [...without, payload];
          });
          return;
        }
        if (payload.kind === "rps_open") {
          setRpsDuel({
            open: payload,
            localThrow: null,
            hostThrow: null,
            guestThrow: null,
            result: null,
            globalNote: null,
          });
          return;
        }
        if (payload.kind === "rps_throw") {
          setRpsDuel((prev) => {
            if (!prev || prev.open.duelId !== payload.duelId) {
              return prev;
            }
            const isHostThrow = payload.playerId !== prev.open.guestPlayerId;
            const hostThrow = isHostThrow ? payload.throw : prev.hostThrow;
            const guestThrow = !isHostThrow ? payload.throw : prev.guestThrow;
            const next: ActiveRpsDuel = {
              ...prev,
              hostThrow,
              guestThrow,
              globalNote: null,
            };
            if (config.role === "host" && hostThrow && guestThrow) {
              window.setTimeout(() => tryResolveRps(next, hostThrow, guestThrow), 0);
            }
            return next;
          });
          return;
        }
        if (payload.kind === "rps_result") {
          setRpsDuel((prev) => {
            if (!prev || prev.open.duelId !== payload.duelId) {
              return prev;
            }
            return {
              ...prev,
              hostThrow: payload.hostThrow,
              guestThrow: payload.guestThrow,
              result: payload.winner,
              globalNote: null,
            };
          });
          if (payload.winner !== "draw" && config.role === "guest") {
            window.setTimeout(() => setRpsDuel(null), 1200);
          }
          return;
        }
        if (payload.kind === "rps_global_pick") {
          setRpsDuel((prev) => {
            if (!prev || prev.open.duelId !== payload.duelId) {
              return prev;
            }
            return {
              ...prev,
              result: null,
              globalNote: payload.note,
            };
          });
          if (config.role === "guest") {
            window.setTimeout(() => setRpsDuel(null), 1400);
          }
          return;
        }
        return;
      }

      const cursor = parseCursorPayload(payload);
      if (!cursor || cursor.playerId === playerId) {
        return;
      }
      peersRef.current.add(cursor.playerId);
      setPeerCount(peersRef.current.size);
      setRemoteStates((prev) =>
        mergeRemoteCursorPayloads({
          nowMs,
          payloads: [cursor],
          states: prev,
        }),
      );
    });

    transport.post({
      roomCode: config.roomCode,
      fromPlayerId: playerId,
      payload: {
        version: 1,
        kind: "hello",
        playerId,
        alias: config.alias,
        role: config.role,
        updatedAtMs: Date.now(),
      },
    });

    const pruneTimer = window.setInterval(() => {
      const nowMs = Date.now();
      setRemoteStates((prev) =>
        pruneStaleRemoteCursors({ nowMs, staleAfterMs: STALE_MS, states: prev }),
      );
    }, 1000);

    return () => {
      unsub();
      window.clearInterval(pruneTimer);
      transport.close();
      transportRef.current = null;
      peersRef.current = new Set();
      setPeerCount(0);
      setRemoteStates(new Map());
      setGuestVotes([]);
      setRemoteStory(null);
      setRpsDuel(null);
      lastCursorRef.current = null;
    };
  }, [config, playerId, tryResolveRps]);

  const remoteCursors = useRemoteCursorAnimation(Boolean(config), remoteStates);

  const publishCursor = useCallback(
    (xNorm: number, yNorm: number) => {
      if (!config || !transportRef.current) {
        return;
      }
      const nowMs = Date.now();
      const next = createCursorPayload({
        playerId,
        alias: config.alias,
        xNorm,
        yNorm,
        isHost: config.role === "host",
        updatedAtMs: nowMs,
      });
      if (!shouldPublishCursor({ next, previous: lastCursorRef.current, nowMs })) {
        return;
      }
      lastCursorRef.current = next;
      transportRef.current.post({
        roomCode: config.roomCode,
        fromPlayerId: playerId,
        payload: next,
      });
    },
    [config, playerId],
  );

  const publishStory = useCallback(
    (story: Omit<StoryMirrorPayloadV1, "version" | "kind" | "updatedAtMs" | "hostAlias">) => {
      if (!config || config.role !== "host" || !transportRef.current) {
        return;
      }
      transportRef.current.post({
        roomCode: config.roomCode,
        fromPlayerId: playerId,
        payload: {
          version: 1,
          kind: "story",
          ...story,
          hostAlias: config.alias,
          updatedAtMs: Date.now(),
        },
      });
    },
    [config, playerId],
  );

  const publishVote = useCallback(
    (vote: { choiceIndex: number; choiceText: string; sceneId: string | null }) => {
      if (!config || config.role !== "guest" || !transportRef.current) {
        return;
      }
      transportRef.current.post({
        roomCode: config.roomCode,
        fromPlayerId: playerId,
        payload: {
          version: 1,
          kind: "vote",
          playerId,
          alias: config.alias,
          choiceIndex: vote.choiceIndex,
          choiceText: vote.choiceText,
          sceneId: vote.sceneId,
          updatedAtMs: Date.now(),
        },
      });
    },
    [config, playerId],
  );

  const clearVotes = useCallback(() => {
    setGuestVotes([]);
  }, []);

  const openRpsDuel = useCallback(
    (input: {
      sceneId: string | null;
      hostChoiceIndex: number;
      hostChoiceText: string;
      guestChoiceIndex: number;
      guestChoiceText: string;
      guestPlayerId: string;
    }) => {
      if (!config || config.role !== "host" || !transportRef.current) {
        return;
      }
      const open: RpsOpenPayloadV1 = {
        version: 1,
        kind: "rps_open",
        duelId: makeDuelId(),
        ...input,
        updatedAtMs: Date.now(),
      };
      transportRef.current.post({
        roomCode: config.roomCode,
        fromPlayerId: playerId,
        payload: open,
      });
      setRpsDuel({
        open,
        localThrow: null,
        hostThrow: null,
        guestThrow: null,
        result: null,
        globalNote: null,
      });
    },
    [config, playerId],
  );

  const publishRpsThrow = useCallback(
    (value: RpsThrow) => {
      if (!config || !transportRef.current) {
        return;
      }
      const duel = rpsDuelRef.current;
      if (!duel) {
        return;
      }
      if (duel.localThrow && duel.result !== "draw") {
        return;
      }
      transportRef.current.post({
        roomCode: config.roomCode,
        fromPlayerId: playerId,
        payload: {
          version: 1,
          kind: "rps_throw",
          duelId: duel.open.duelId,
          playerId,
          throw: value,
          updatedAtMs: Date.now(),
        },
      });
      setRpsDuel((prev) => {
        if (!prev) {
          return prev;
        }
        const isHost = config.role === "host";
        const hostThrow = isHost ? value : prev.hostThrow;
        const guestThrow = !isHost ? value : prev.guestThrow;
        const next: ActiveRpsDuel = {
          ...prev,
          localThrow: value,
          hostThrow,
          guestThrow,
          result: prev.result === "draw" ? null : prev.result,
          globalNote: null,
        };
        if (config.role === "host" && hostThrow && guestThrow) {
          window.setTimeout(() => tryResolveRps(next, hostThrow, guestThrow), 0);
        }
        return next;
      });
    },
    [config, playerId, tryResolveRps],
  );

  const resolveRpsWithGlobal = useCallback(
    (winningChoiceIndex: number, note: string) => {
      if (!config || config.role !== "host" || !transportRef.current) {
        return;
      }
      const duel = rpsDuelRef.current;
      if (!duel) {
        return;
      }
      transportRef.current.post({
        roomCode: config.roomCode,
        fromPlayerId: playerId,
        payload: {
          version: 1,
          kind: "rps_global_pick",
          duelId: duel.open.duelId,
          winningChoiceIndex,
          note,
          updatedAtMs: Date.now(),
        },
      });
      setRpsDuel({
        ...duel,
        globalNote: note,
        result: null,
      });
      finishWithWinner(winningChoiceIndex, 1100);
    },
    [config, finishWithWinner, playerId],
  );

  const clearRpsDuel = useCallback(() => {
    setRpsDuel(null);
  }, []);

  const setOnRpsResolved = useCallback((cb: ((winningChoiceIndex: number) => void) | null) => {
    onRpsResolvedRef.current = cb;
  }, []);

  const rpsView: RpsDuelView | null = buildRpsView(rpsDuel, config?.role);

  if (!config) {
    return null;
  }

  return {
    roomCode: config.roomCode,
    role: config.role,
    playerId,
    alias: config.alias,
    transportKind,
    peerCount,
    remoteCursors,
    guestVotes,
    remoteStory,
    rpsDuel,
    rpsView,
    publishCursor,
    publishStory,
    publishVote,
    clearVotes,
    openRpsDuel,
    publishRpsThrow,
    resolveRpsWithGlobal,
    clearRpsDuel,
    setOnRpsResolved,
  };
}
