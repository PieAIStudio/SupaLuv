import { z } from "zod";

export const CHARACTER_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const MAX_CHARACTER_REFERENCE_BYTES = 10 * 1024 * 1024;
export const MAX_CHARACTER_REFERENCES = 3;

const stableClientId = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);

export const characterReferenceDescriptorSchema = z
  .object({
    clientReferenceId: stableClientId,
    mimeType: z.enum(CHARACTER_IMAGE_MIME_TYPES),
    sizeBytes: z.number().int().positive().max(MAX_CHARACTER_REFERENCE_BYTES),
  })
  .strict();

export const characterGenerationRequestSchema = z
  .object({
    clientActionId: stableClientId,
    slotId: stableClientId,
    brief: z.string().trim().min(1).max(2_000),
    references: z.array(characterReferenceDescriptorSchema).max(MAX_CHARACTER_REFERENCES),
  })
  .strict();

export type CharacterReferenceDescriptor = z.infer<typeof characterReferenceDescriptorSchema>;
export type CharacterGenerationRequest = z.infer<typeof characterGenerationRequestSchema>;
