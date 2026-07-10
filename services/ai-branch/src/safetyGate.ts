import {
  ADULT_COMEDY_MODERATION_POLICY,
  createContentModerationProvider,
} from "@pieai/swimmer-ai-kit/content-safety";
import type { AiBranchRequestBody, AiBranchResponseBody } from "./handler.js";

const moderation = createContentModerationProvider({
  policy: ADULT_COMEDY_MODERATION_POLICY,
  sightengineApiUser: process.env.SIGHTENGINE_API_USER,
  sightengineApiSecret: process.env.SIGHTENGINE_API_SECRET,
});

/** Review user-facing strings before/after generation. */
export async function reviewAiBranchRequest(
  body: AiBranchRequestBody,
): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  const corpus = [
    body.config.context,
    ...body.authoredChoiceLabels,
  ].join("\n");
  const decision = await moderation.reviewText({ stage: "input", text: corpus });
  if (!decision.allowed) {
    return {
      allowed: false,
      reason: decision.reasonCode ?? decision.category ?? "blocked",
    };
  }
  return { allowed: true };
}

export async function reviewAiBranchResponse(
  body: AiBranchRequestBody,
  result: AiBranchResponseBody,
): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  const corpus = [
    body.config.context,
    result.choiceLabel,
    ...result.beats.map((b) => `${b.speaker}: ${b.text}`),
  ].join("\n");
  const decision = await moderation.reviewText({
    stage: "output",
    request: body.config.context,
    text: corpus,
  });
  if (!decision.allowed) {
    return {
      allowed: false,
      reason: decision.reasonCode ?? decision.category ?? "blocked",
    };
  }
  return { allowed: true };
}
