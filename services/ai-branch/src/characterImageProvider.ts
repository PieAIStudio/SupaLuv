export type CharacterImageInput = {
  readonly bytes: Uint8Array;
  readonly mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/avif";
};

export type GeneratedCharacterImage = CharacterImageInput & {
  readonly modelId: string;
  readonly providerRequestMetadata: Readonly<{
    interactionId?: string;
    referenceCount: number;
    purpose: "base" | "mood" | "still";
  }>;
};

export interface CharacterImageProvider {
  generateBase(input: {
    readonly prompt: string;
    readonly references: readonly CharacterImageInput[];
  }): Promise<GeneratedCharacterImage>;
  generateMood(input: {
    readonly prompt: string;
    readonly mood: string;
    readonly base: CharacterImageInput;
  }): Promise<GeneratedCharacterImage>;
  generateStill(input: {
    readonly prompt: string;
    readonly characters: readonly CharacterImageInput[];
  }): Promise<GeneratedCharacterImage>;
}

export type CharacterImageProviderErrorCode =
  | "invalid_reference_count"
  | "provider_rejected"
  | "missing_image"
  | "invalid_image";

export class CharacterImageProviderError extends Error {
  constructor(
    readonly code: CharacterImageProviderErrorCode,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "CharacterImageProviderError";
  }
}
