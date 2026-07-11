import { createHash } from "node:crypto";

export type AiActionKind =
  | "character_base"
  | "character_regeneration"
  | "character_mood_pack"
  | "character_mood"
  | "ai_side_choice"
  | "ai_ending_segment"
  | "ai_ending_still";

function requiredPart(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} is required`);
  }
  return normalized;
}

export function makeActionIdempotencyKey(
  userId: string,
  kind: AiActionKind,
  scopeId: string,
  clientActionId: string,
): string {
  const normalizedKind = requiredPart(kind, "kind") as AiActionKind;
  const digest = createHash("sha256")
    .update(
      JSON.stringify([
        requiredPart(userId, "userId"),
        normalizedKind,
        requiredPart(scopeId, "scopeId"),
        requiredPart(clientActionId, "clientActionId"),
      ]),
    )
    .digest("hex");

  return `supaluv:${normalizedKind}:${digest}`;
}
