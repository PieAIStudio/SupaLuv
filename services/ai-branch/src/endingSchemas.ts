import { z } from "zod";
import type { AiEndingContract, AiEndingSegment } from "../../../packages/shared/src/ai-ending.js";

export const endingOutlineSchema = z.object({
  outcomeAnchor: z.string().min(1).max(120),
  segmentPlan: z.array(z.string().min(1).max(300)).min(3).max(8),
  terminalImage: z.string().min(1).max(300),
});

const endingChoiceSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(80),
  actionSummary: z.string().min(1).max(240),
});

const rawSegmentSchema = z.object({
  sequence: z.number().int().min(1).max(8),
  text: z.string().min(1).max(2_200),
  beats: z.array(z.string().min(1).max(500)).min(1).max(8),
  speakers: z.array(z.string().min(1).max(80)).min(1).max(8),
  choices: z.array(endingChoiceSchema).max(4),
  continuity: z.object({
    facts: z.array(z.string().min(1).max(300)).max(24),
    unresolvedThreads: z.array(z.string().min(1).max(300)).max(12).optional(),
    relationshipChanges: z.record(z.string(), z.string().max(240)).optional(),
  }),
  terminal: z.boolean(),
  outcomeAnchor: z.string().max(120).optional(),
  backgroundKey: z.string().max(120).optional(),
  stillCue: z.string().max(300).optional(),
});

export function parseEndingSegment(
  raw: unknown,
  contract: AiEndingContract,
  expectedSequence: number,
  allowedSpeakers: readonly string[],
): AiEndingSegment {
  const segment = rawSegmentSchema.parse(raw);
  if (segment.sequence !== expectedSequence) throw new Error("ending sequence mismatch");
  if (segment.speakers.some((speaker) => !allowedSpeakers.includes(speaker))) {
    throw new Error("ending contains a forbidden speaker");
  }
  if (segment.backgroundKey && !contract.allowedBackgrounds.includes(segment.backgroundKey)) {
    throw new Error("ending contains an unresolved background key");
  }
  if (expectedSequence === contract.forceTerminalAtSegment && !segment.terminal) {
    throw new Error("final ending segment must be terminal");
  }
  if (segment.terminal) {
    if (segment.choices.length !== 0) throw new Error("terminal segment cannot have choices");
    if (!segment.outcomeAnchor || !contract.allowedOutcomeAnchors.includes(segment.outcomeAnchor)) {
      throw new Error("terminal segment has an invalid outcome anchor");
    }
  } else if (segment.choices.length < 2 || segment.choices.length > 4) {
    throw new Error("non-terminal segment must have 2–4 choices");
  }
  const { speakers: _speakers, ...result } = segment;
  return result;
}
