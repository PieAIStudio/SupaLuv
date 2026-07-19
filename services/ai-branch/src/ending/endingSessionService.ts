import { randomUUID } from "node:crypto";
import type {
  AiEndingContract,
  AiEndingPlayerAction,
  AiEndingSegment,
} from "@supaluv/shared/ai-ending";
import { makeActionIdempotencyKey } from "../actionIdentity.js";
import type { CharacterGenerationWallet } from "../character/characterGenerationService.js";
import type { EndingGenerator } from "./mastraEnding.js";
import type { EndingSessionStore } from "../persistence/endingSessionStore.js";
import type { EndingSessionRecord } from "../persistence/types.js";

export interface EndingSafety {
  reviewInput(action: AiEndingPlayerAction): Promise<void>;
  reviewOutput(segment: AiEndingSegment): Promise<void>;
}

export class EndingPaymentError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "EndingPaymentError";
  }
}

export function createEndingSessionService(options: {
  readonly store: EndingSessionStore;
  readonly wallet: CharacterGenerationWallet;
  readonly safety: EndingSafety;
  readonly generator: EndingGenerator;
  readonly segmentCostBatteries: number;
}) {
  async function get(ownerId: string, sessionId: string) {
    const session = await options.store.getEndingSession(ownerId, sessionId);
    if (!session) throw new Error("AI ending session not found");
    const checkpoints = await options.store.listEndingCheckpoints(ownerId, sessionId);
    return { session, checkpoints };
  }

  async function advance(input: {
    ownerId: string;
    sessionId: string;
    clientActionId: string;
    expectedVersion: number;
    action: AiEndingPlayerAction;
    contract: AiEndingContract;
    allowedSpeakers: readonly string[];
  }) {
    const session = await options.store.getEndingSession(input.ownerId, input.sessionId);
    if (!session) throw new Error("AI ending session not found");
    const actionKey = makeActionIdempotencyKey(
      input.ownerId,
      "ai_ending_segment",
      input.sessionId,
      input.clientActionId,
    );
    const prior = (await options.store.listEndingCheckpoints(input.ownerId, input.sessionId)).find(
      (item) => item.actionKey === actionKey,
    );
    if (prior)
      return {
        checkpoint: prior,
        segment: prior.segment as unknown as AiEndingSegment,
        idempotent: true,
      };

    await options.safety.reviewInput(input.action);
    const reserved = await options.wallet.reserve({
      ownerId: input.ownerId,
      batteries: options.segmentCostBatteries,
      reason: "ai_ending_segment",
      idempotencyKey: actionKey,
    });
    if (!reserved.ok) {
      await options.store.saveEndingSession({ ...session, status: "paused" });
      throw new EndingPaymentError(reserved.code, reserved.message);
    }
    let settled = false;
    try {
      let active: EndingSessionRecord = session;
      let outline = session.outline;
      if (!outline) {
        outline = await options.generator.generateOutline(input.contract);
        active = {
          ...session,
          status: "active",
          outline,
          outcomeAnchor: String(outline.outcomeAnchor),
        };
        await options.store.saveEndingSession(active);
      }
      const sequence = active.currentSequence + 1;
      const segment = await options.generator.generateSegment({
        contract: input.contract,
        sequence,
        outline,
        continuity: active.continuity as never,
        playerAction: input.action,
        allowedSpeakers: input.allowedSpeakers,
      });
      await options.safety.reviewOutput(segment);
      const checkpointInput = {
        ownerId: input.ownerId,
        sessionId: input.sessionId,
        expectedVersion: input.expectedVersion,
        actionKey,
        playerAction: input.action as unknown as Readonly<Record<string, unknown>>,
        segment: segment as unknown as Readonly<Record<string, unknown>>,
        choices: segment.choices as unknown as readonly Readonly<Record<string, unknown>>[],
        continuity: segment.continuity as unknown as Readonly<Record<string, unknown>>,
        terminal: segment.terminal,
      };
      const checkpoint =
        !reserved.skipped && reserved.amountPowerUnits > 0
          ? await options.store.settleEndingCheckpoint({
              ...checkpointInput,
              walletReservationId: reserved.reservationId,
              amountPowerUnits: reserved.amountPowerUnits,
              metadata: { sequence, includesOutline: !session.outline },
            })
          : await options.store.advanceEndingCheckpoint(checkpointInput);
      settled = !reserved.skipped && reserved.amountPowerUnits > 0;
      return { checkpoint, segment, idempotent: false };
    } catch (error) {
      if (!settled) {
        await options.wallet.refund(reserved.reservationId, "ai_ending_segment_failed");
      }
      throw error;
    }
  }

  return {
    async startSession(input: {
      ownerId: string;
      storyRunId: string;
      clientSessionId: string;
      clientActionId: string;
      contract: AiEndingContract;
      allowedSpeakers: readonly string[];
    }) {
      const existing = await options.store.getEndingSessionByClientId(
        input.ownerId,
        input.clientSessionId,
      );
      if (existing) {
        const checkpoints = await options.store.listEndingCheckpoints(input.ownerId, existing.id);
        const latest = checkpoints.at(-1);
        if (latest) {
          return {
            checkpoint: latest,
            segment: latest.segment as unknown as AiEndingSegment,
            idempotent: true,
          };
        }
      }
      const session: EndingSessionRecord = {
        id: randomUUID(),
        ownerId: input.ownerId,
        storyRunId: input.storyRunId,
        clientSessionId: input.clientSessionId,
        entryId: input.contract.entryId,
        status: "outline_pending",
        currentVersion: 0,
        currentSequence: 0,
        maxSegments: input.contract.maxSegments,
        continuity: {
          facts: input.contract.requiredFacts,
          unresolvedThreads: input.contract.unresolvedThreads,
        },
      };
      await options.store.saveEndingSession(session);
      return advance({
        ownerId: input.ownerId,
        sessionId: session.id,
        clientActionId: input.clientActionId,
        expectedVersion: 0,
        action: { kind: "free_text", text: "开始这个非正史最终章" },
        contract: input.contract,
        allowedSpeakers: input.allowedSpeakers,
      });
    },
    advanceSession: advance,
    resumeSession: get,
    getSession: get,
  };
}

export type EndingSessionService = ReturnType<typeof createEndingSessionService>;
