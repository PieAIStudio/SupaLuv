import { afterEach, describe, expect, it, vi } from "vitest";
import {
  characterProviderHealthSnapshot,
  createConfiguredCharacterProviders,
} from "../../services/ai-branch/src/characterProviderConfig";

afterEach(() => vi.unstubAllEnvs());

describe("character provider configuration", () => {
  it("defaults to OpenRouter without requiring a direct Gemini key", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "openrouter-test-key");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("SUPALUV_CHARACTER_IMAGE_PROVIDER", "");

    const configured = createConfiguredCharacterProviders();

    expect(configured.imageProvider.generateBase).toBeTypeOf("function");
    expect(configured.adultReviewer.review).toBeTypeOf("function");
    expect(characterProviderHealthSnapshot()).toEqual({
      provider: "openrouter",
      configured: true,
      imageModel: "google/gemini-3.1-flash-image",
      reviewModel: "google/gemini-3.1-flash-lite",
    });
  });

  it("keeps direct Gemini as an explicit optional provider", () => {
    vi.stubEnv("SUPALUV_CHARACTER_IMAGE_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "direct-gemini-test-key");
    vi.stubEnv("OPENROUTER_API_KEY", "");

    const configured = createConfiguredCharacterProviders();
    expect(configured.imageProvider.generateBase).toBeTypeOf("function");
    expect(configured.adultReviewer.review).toBeTypeOf("function");
  });

  it("reports an unconfigured default without falling back to a different vendor", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "unused-direct-key");
    vi.stubEnv("SUPALUV_CHARACTER_IMAGE_PROVIDER", "openrouter");

    expect(characterProviderHealthSnapshot()).toMatchObject({
      provider: "openrouter",
      configured: false,
    });
    expect(() => createConfiguredCharacterProviders()).toThrow(/OPENROUTER_API_KEY/);
  });
});
