import { makeActionIdempotencyKey } from "../../services/ai-branch/src/actionIdentity";
import { characterGenerationRequestSchema } from "../../services/ai-branch/src/characterSchemas";
import { describe, expect, it } from "vitest";

const validRequest = {
  clientActionId: "action-001",
  slotId: "lead_suming",
  brief: "Adult cinematic portrait.",
  references: [
    {
      clientReferenceId: "reference-1",
      mimeType: "image/jpeg",
      sizeBytes: 512_000,
    },
  ],
};

describe("character service request contracts", () => {
  it("accepts a bounded image-reference request", () => {
    expect(characterGenerationRequestSchema.parse(validRequest)).toEqual(validRequest);
  });

  it("rejects unsupported image MIME types", () => {
    const result = characterGenerationRequestSchema.safeParse({
      ...validRequest,
      references: [{ ...validRequest.references[0], mimeType: "image/svg+xml" }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects more than three references", () => {
    const result = characterGenerationRequestSchema.safeParse({
      ...validRequest,
      references: Array.from({ length: 4 }, (_, index) => ({
        ...validRequest.references[0],
        clientReferenceId: `reference-${index}`,
      })),
    });

    expect(result.success).toBe(false);
  });

  it("requires a client action id", () => {
    const { clientActionId: _clientActionId, ...withoutActionId } = validRequest;
    expect(characterGenerationRequestSchema.safeParse(withoutActionId).success).toBe(false);
  });

  it("creates a stable, scoped, non-secret idempotency key", () => {
    const first = makeActionIdempotencyKey("user-1", "character_base", "pack-1", "action-001");
    const replay = makeActionIdempotencyKey("user-1", "character_base", "pack-1", "action-001");
    const otherUser = makeActionIdempotencyKey("user-2", "character_base", "pack-1", "action-001");

    expect(replay).toBe(first);
    expect(otherUser).not.toBe(first);
    expect(first).toMatch(/^supaluv:character_base:[a-f0-9]{64}$/);
    expect(first).not.toContain("user-1");
  });
});
