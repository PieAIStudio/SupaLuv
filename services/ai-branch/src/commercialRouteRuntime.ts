/**
 * Commercial AI route dependency composition.
 *
 * Owns lazy construction of Supabase client, persistence modules, asset storage,
 * moderation, and generation-wallet adapters for character / ending / spend routes.
 * Route modules accept explicit dependencies and own only HTTP / domain orchestration.
 *
 * Importing this module (or routeTable) does not read process.env for commercial
 * secrets or construct stores — that happens on first dependency getter call.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  ADULT_COMEDY_MODERATION_POLICY,
  createContentModerationProvider,
  type ContentModerationProvider,
} from "@pieai/swimmer-ai-kit/content-safety";
import { verifyBearerToken } from "./authGate.js";
import {
  CharacterAssetStorageError,
  createCharacterAssetService,
  createSupabaseCharacterAssetStorage,
  type CharacterAssetBinaryStorage,
  type CharacterAssetRouteDependencies,
  type CharacterAssetStorage,
} from "./character/characterAssetService.js";
import {
  createCharacterGenerationService,
  type CharacterGenerationWallet,
} from "./character/characterGenerationService.js";
import { createCharacterSafety } from "./character/characterSafety.js";
import { createConfiguredCharacterProviders } from "./character/characterProviderConfig.js";
import type { CharacterPackRouteDependencies } from "./character/characterRoutes.js";
import type { EndingRouteDependencies } from "./ending/endingRoutes.js";
import { createEndingSessionService } from "./ending/endingSessionService.js";
import { createConfiguredEndingGenerator } from "./ending/mastraEnding.js";
import { resolveCommercialServerCredentials } from "./commercialServerConfig.js";
import {
  createInMemoryPersistenceModules,
  createSupabasePersistenceFromClient,
  type PersistenceModules,
  type SpendReceiptReader,
} from "./persistence/index.js";
import { commitReservation, refundReservation, reserveBatteries } from "./wallet/walletMeter.js";

export type CommercialRouteEnv = {
  readonly nodeEnv?: string;
  readonly supabaseUrl?: string;
  readonly serviceRoleKey?: string;
  readonly sightengineApiUser?: string;
  readonly sightengineApiSecret?: string;
  readonly referenceCleanupSecret?: string;
  readonly characterBaseCostBatteries?: string;
  readonly characterMoodCostBatteries?: string;
  readonly endingSegmentCostBatteries?: string;
};

export type CreateCommercialRouteRuntimeOptions = {
  /**
   * Explicit env snapshot for tests. When omitted, process.env is read lazily
   * on first dependency construction (after server loadSecrets).
   */
  readonly env?: CommercialRouteEnv;
  readonly clientFactory?: typeof createClient;
  readonly verifyAuth?: typeof verifyBearerToken;
  readonly createPersistenceFromClient?: (client: SupabaseClient) => PersistenceModules;
  readonly createAssetStorage?: (client: SupabaseClient) => CharacterAssetBinaryStorage;
  readonly createCharacterProviders?: typeof createConfiguredCharacterProviders;
  readonly createEndingGenerator?: typeof createConfiguredEndingGenerator;
  readonly createModeration?: (input: {
    readonly sightengineApiUser?: string;
    readonly sightengineApiSecret?: string;
  }) => ContentModerationProvider;
  readonly wallet?: CharacterGenerationWallet;
};

export type CommercialRouteRuntime = {
  getCharacterAssetDependencies(): CharacterAssetRouteDependencies;
  getCharacterPackDependencies(): CharacterPackRouteDependencies;
  getEndingDependencies(): EndingRouteDependencies;
  getSpendReceiptReader(): SpendReceiptReader;
};

type SharedDatabaseCore = {
  readonly persistence: PersistenceModules;
  readonly assetStorage: CharacterAssetBinaryStorage;
};

function readEnvFromProcess(): CommercialRouteEnv {
  const creds = resolveCommercialServerCredentials();
  return {
    nodeEnv: process.env.NODE_ENV,
    supabaseUrl: creds?.supabaseUrl,
    serviceRoleKey: creds?.serviceRoleKey,
    sightengineApiUser: process.env.SIGHTENGINE_API_USER,
    sightengineApiSecret: process.env.SIGHTENGINE_API_SECRET,
    referenceCleanupSecret: process.env.SUPALUV_REFERENCE_CLEANUP_SECRET,
    characterBaseCostBatteries: process.env.SUPALUV_CHARACTER_BASE_COST_BATTERIES,
    characterMoodCostBatteries: process.env.SUPALUV_CHARACTER_MOOD_COST_BATTERIES,
    endingSegmentCostBatteries: process.env.SUPALUV_ENDING_SEGMENT_COST_BATTERIES,
  };
}

function createUnavailableCharacterAssetStorage(): CharacterAssetStorage {
  return {
    createSignedUpload: async () => {
      throw new CharacterAssetStorageError();
    },
    inspect: async () => {
      throw new CharacterAssetStorageError();
    },
    remove: async () => {
      throw new CharacterAssetStorageError();
    },
  };
}

function createDefaultGenerationWallet(): CharacterGenerationWallet {
  return {
    reserve: (input) =>
      reserveBatteries({
        userId: input.ownerId,
        batteries: input.batteries,
        reason: input.reason,
        idempotencyKey: input.idempotencyKey,
      }),
    commit: (reservationId, reason) => commitReservation({ reservationId, reason }),
    refund: (reservationId, reason) => refundReservation({ reservationId, reason }),
  };
}

/**
 * Build a commercial route runtime. Suitable for deterministic tests (pass `env`
 * and optional factories) and for the production lazy singleton.
 */
export function createCommercialRouteRuntime(
  options: CreateCommercialRouteRuntimeOptions = {},
): CommercialRouteRuntime {
  const verifyAuth = options.verifyAuth ?? verifyBearerToken;
  const clientFactory = options.clientFactory ?? createClient;
  const createPersistence =
    options.createPersistenceFromClient ?? createSupabasePersistenceFromClient;
  const createAssetStorage = options.createAssetStorage ?? createSupabaseCharacterAssetStorage;
  const createCharacterProviders =
    options.createCharacterProviders ?? createConfiguredCharacterProviders;
  const createEndingGenerator = options.createEndingGenerator ?? createConfiguredEndingGenerator;

  let resolvedEnv: CommercialRouteEnv | undefined;
  let sharedCore: SharedDatabaseCore | null | undefined;
  let sharedCoreAttempted = false;
  let moderation: ContentModerationProvider | undefined;
  let generationWallet: CharacterGenerationWallet | undefined;

  let characterAssetDependencies: CharacterAssetRouteDependencies | undefined;
  let characterPackDependencies: CharacterPackRouteDependencies | undefined;
  let endingDependencies: EndingRouteDependencies | undefined;
  let spendReceiptReader: SpendReceiptReader | undefined;

  function env(): CommercialRouteEnv {
    if (options.env) return options.env;
    resolvedEnv ??= readEnvFromProcess();
    return resolvedEnv;
  }

  function credentials(): { readonly url: string; readonly key: string } | null {
    // Deterministic tests inject via options.env (supabaseUrl / serviceRoleKey).
    // Live paths use resolveCommercialServerCredentials for the canonical
    // SwimmerBackend server variables.
    const snapshot = env();
    const resolved = resolveCommercialServerCredentials({
      SWIMMER_BACKEND_SUPABASE_URL: snapshot.supabaseUrl,
      SWIMMER_BACKEND_SECRET_KEY: snapshot.serviceRoleKey,
    });
    if (!resolved) return null;
    return { url: resolved.supabaseUrl, key: resolved.serviceRoleKey };
  }

  function ensureSharedCore(): SharedDatabaseCore | null {
    if (sharedCoreAttempted) return sharedCore ?? null;
    const creds = credentials();
    if (!creds) {
      sharedCore = null;
      sharedCoreAttempted = true;
      return null;
    }
    const client = clientFactory(creds.url, creds.key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const persistence = createPersistence(client);
    const assetStorage = createAssetStorage(client);
    sharedCore = { persistence, assetStorage };
    sharedCoreAttempted = true;
    return sharedCore;
  }

  function requireSharedCore(missingMessage: string): SharedDatabaseCore {
    const core = ensureSharedCore();
    if (!core) throw new Error(missingMessage);
    return core;
  }

  function getModeration(): ContentModerationProvider {
    if (moderation) return moderation;
    const snapshot = env();
    const factory =
      options.createModeration ??
      ((input) =>
        createContentModerationProvider({
          policy: ADULT_COMEDY_MODERATION_POLICY,
          sightengineApiUser: input.sightengineApiUser,
          sightengineApiSecret: input.sightengineApiSecret,
        }));
    moderation = factory({
      sightengineApiUser: snapshot.sightengineApiUser,
      sightengineApiSecret: snapshot.sightengineApiSecret,
    });
    return moderation;
  }

  function getGenerationWallet(): CharacterGenerationWallet {
    generationWallet ??= options.wallet ?? createDefaultGenerationWallet();
    return generationWallet;
  }

  return {
    getCharacterAssetDependencies() {
      if (characterAssetDependencies) return characterAssetDependencies;

      const snapshot = env();
      const mode = snapshot.nodeEnv === "production" ? "production" : "development";
      const core = ensureSharedCore();

      if (!core) {
        if (mode === "production") {
          throw new Error("SupaLuv character storage credentials are required in production");
        }
        characterAssetDependencies = {
          verifyAuth,
          assets: createCharacterAssetService({
            store: createInMemoryPersistenceModules().characterGeneration,
            storage: createUnavailableCharacterAssetStorage(),
          }),
          cleanupSecret: snapshot.referenceCleanupSecret,
        };
        return characterAssetDependencies;
      }

      characterAssetDependencies = {
        verifyAuth,
        assets: createCharacterAssetService({
          store: core.persistence.characterGeneration,
          storage: core.assetStorage,
        }),
        cleanupSecret: snapshot.referenceCleanupSecret,
      };
      return characterAssetDependencies;
    },

    getCharacterPackDependencies() {
      if (characterPackDependencies) return characterPackDependencies;

      const core = requireSharedCore("SupaLuv character database credentials are required");
      const snapshot = env();
      const characterProviders = createCharacterProviders();
      const moderationProvider = getModeration();
      const storage = core.assetStorage;
      const store = core.persistence.characterGeneration;

      characterPackDependencies = {
        verifyAuth,
        store,
        generation: createCharacterGenerationService({
          store,
          storage,
          provider: characterProviders.imageProvider,
          safety: createCharacterSafety({
            moderation: moderationProvider,
            semanticReviewer: characterProviders.adultReviewer,
          }),
          wallet: getGenerationWallet(),
          baseCostBatteries: Number(snapshot.characterBaseCostBatteries ?? "1"),
          moodCostBatteries: Number(snapshot.characterMoodCostBatteries ?? "1"),
        }),
        signAsset: (storagePath) => storage.createSignedDownload(storagePath),
      };
      return characterPackDependencies;
    },

    getEndingDependencies() {
      if (endingDependencies) return endingDependencies;

      const core = requireSharedCore("AI ending database credentials are required");
      const snapshot = env();
      const moderationProvider = getModeration();
      const store = core.persistence.endingSession;

      endingDependencies = {
        verifyAuth,
        store,
        service: createEndingSessionService({
          store,
          wallet: getGenerationWallet(),
          generator: createEndingGenerator(),
          segmentCostBatteries: Number(snapshot.endingSegmentCostBatteries ?? "1"),
          safety: {
            async reviewInput(action) {
              const text = action.kind === "free_text" ? action.text : action.choiceId;
              const decision = await moderationProvider.reviewText({ stage: "input", text });
              if (!decision.allowed) throw new Error("SAFETY_BLOCKED");
            },
            async reviewOutput(segment) {
              const decision = await moderationProvider.reviewText({
                stage: "output",
                text: segment.text,
              });
              if (!decision.allowed) throw new Error("SAFETY_BLOCKED");
            },
          },
        }),
      };
      return endingDependencies;
    },

    getSpendReceiptReader() {
      if (spendReceiptReader) return spendReceiptReader;
      const core = requireSharedCore("Spend analysis database credentials are required");
      spendReceiptReader = core.persistence.spendReceipts;
      return spendReceiptReader;
    },
  };
}

let productionRuntime: CommercialRouteRuntime | undefined;

/** Lazy production singleton — constructed on first commercial route dependency access. */
export function getCommercialRouteRuntime(): CommercialRouteRuntime {
  productionRuntime ??= createCommercialRouteRuntime();
  return productionRuntime;
}
