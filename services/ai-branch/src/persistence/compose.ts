import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CharacterGenerationStore } from "./characterGenerationStore.js";
import type { EndingSessionStore } from "./endingSessionStore.js";
import { createInMemoryPersistenceModules } from "./memory.js";
import type { SpendReceiptReader } from "./spendReceipts.js";
import { createSupabasePersistenceModules } from "./supabase.js";

export type PersistenceModules = {
  readonly characterGeneration: CharacterGenerationStore;
  readonly endingSession: EndingSessionStore;
  readonly spendReceipts: SpendReceiptReader;
};

export type ConfiguredPersistenceOptions = {
  readonly mode: "development" | "test" | "production";
  readonly supabaseUrl?: string;
  readonly serviceRoleKey?: string;
  readonly clientFactory?: typeof createClient;
};

/**
 * Build the three commercial persistence modules.
 * Source/config construction stays here — domain interfaces never read process.env.
 * AI side-choice settlement is walletMeter.settleReservation, not a persistence writer.
 */
export function createConfiguredPersistenceModules(
  options: ConfiguredPersistenceOptions,
): PersistenceModules {
  const url = options.supabaseUrl?.trim();
  const key = options.serviceRoleKey?.trim();
  if (!url || !key) {
    if (options.mode === "production") {
      throw new Error("SupaLuv server database credentials are required in production");
    }
    return createInMemoryPersistenceModules();
  }

  const factory = options.clientFactory ?? createClient;
  const client = factory(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return createSupabasePersistenceModules(client);
}

export function createSupabasePersistenceFromClient(client: SupabaseClient): PersistenceModules {
  return createSupabasePersistenceModules(client);
}
