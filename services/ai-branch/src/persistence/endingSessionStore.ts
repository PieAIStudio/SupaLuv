import type {
  AdvanceEndingCheckpointInput,
  EndingCheckpointRecord,
  EndingSessionRecord,
  SettleEndingCheckpointInput,
  StoryRunRecord,
} from "./types.js";

/**
 * AI ending commercial persistence: story runs, ending sessions, checkpoints,
 * and atomic charge+delivery settlement for ending segments.
 *
 * Receipt writes happen only inside settleEndingCheckpoint.
 */
export interface EndingSessionStore {
  saveStoryRun(record: StoryRunRecord): Promise<StoryRunRecord>;
  getStoryRun(ownerId: string, runId: string): Promise<StoryRunRecord | null>;
  saveEndingSession(record: EndingSessionRecord): Promise<EndingSessionRecord>;
  getEndingSession(ownerId: string, sessionId: string): Promise<EndingSessionRecord | null>;
  getEndingSessionByClientId(
    ownerId: string,
    clientSessionId: string,
  ): Promise<EndingSessionRecord | null>;
  advanceEndingCheckpoint(input: AdvanceEndingCheckpointInput): Promise<EndingCheckpointRecord>;
  settleEndingCheckpoint(input: SettleEndingCheckpointInput): Promise<EndingCheckpointRecord>;
  listEndingCheckpoints(
    ownerId: string,
    sessionId: string,
  ): Promise<readonly EndingCheckpointRecord[]>;
}
