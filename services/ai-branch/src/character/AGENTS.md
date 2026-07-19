# character/

**Owns**: character pack generation, image providers (Gemini/OpenRouter), safety review, asset storage routes, request schemas.

**Does not own**: wallet metering, AI branch dialogue, ending sessions, TTS, HTTP table wiring.

**Entry**: `characterRoutes.ts`, `characterAssetService.ts` (HTTP); `characterGenerationService.ts` (domain); `characterProviderConfig.ts` (provider wiring).
