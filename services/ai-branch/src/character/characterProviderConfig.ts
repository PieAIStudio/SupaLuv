import type { CharacterImageProvider } from "./characterImageProvider.js";
import type { GeneratedAdultPresentationReviewer } from "./characterSafety.js";
import {
  GEMINI_CHARACTER_IMAGE_MODEL,
  createConfiguredGeminiCharacterImageProvider,
} from "./geminiCharacterImageProvider.js";
import {
  GEMINI_ADULT_PRESENTATION_MODEL,
  createConfiguredGeminiAdultPresentationReviewer,
} from "./characterSafety.js";
import {
  OPENROUTER_CHARACTER_IMAGE_MODEL,
  createConfiguredOpenRouterCharacterImageProvider,
} from "./openRouterCharacterImageProvider.js";
import {
  OPENROUTER_ADULT_PRESENTATION_MODEL,
  createConfiguredOpenRouterAdultPresentationReviewer,
} from "./openRouterCharacterSafety.js";

type CharacterProviderName = "openrouter" | "gemini";

export type ConfiguredCharacterProviders = {
  readonly imageProvider: CharacterImageProvider;
  readonly adultReviewer: GeneratedAdultPresentationReviewer;
};

function selectedProvider(): CharacterProviderName {
  const value = process.env.SUPALUV_CHARACTER_IMAGE_PROVIDER?.trim().toLowerCase();
  if (!value || value === "openrouter") return "openrouter";
  if (value === "gemini") return "gemini";
  throw new Error(`Unsupported SUPALUV_CHARACTER_IMAGE_PROVIDER: ${value}`);
}

export function createConfiguredCharacterProviders(): ConfiguredCharacterProviders {
  const provider = selectedProvider();
  if (provider === "gemini") {
    return {
      imageProvider: createConfiguredGeminiCharacterImageProvider(),
      adultReviewer: createConfiguredGeminiAdultPresentationReviewer(),
    };
  }
  return {
    imageProvider: createConfiguredOpenRouterCharacterImageProvider(),
    adultReviewer: createConfiguredOpenRouterAdultPresentationReviewer(),
  };
}

export function characterProviderHealthSnapshot(): {
  readonly provider: CharacterProviderName | "invalid";
  readonly configured: boolean;
  readonly imageModel: string | null;
  readonly reviewModel: string | null;
} {
  let provider: CharacterProviderName;
  try {
    provider = selectedProvider();
  } catch {
    return { provider: "invalid", configured: false, imageModel: null, reviewModel: null };
  }
  if (provider === "gemini") {
    return {
      provider,
      configured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      imageModel: GEMINI_CHARACTER_IMAGE_MODEL,
      reviewModel: GEMINI_ADULT_PRESENTATION_MODEL,
    };
  }
  return {
    provider,
    configured: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
    imageModel: OPENROUTER_CHARACTER_IMAGE_MODEL,
    reviewModel: OPENROUTER_ADULT_PRESENTATION_MODEL,
  };
}
