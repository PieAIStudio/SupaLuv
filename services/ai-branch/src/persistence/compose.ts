import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CharacterGenerationStore } from "./characterGenerationStore.js";
import type { EndingSessionStore } from "./endingSessionStore.js";
import { createInMemoryPersistenceModules } from "./memory.js";
import type { SideBranchSpendRecorder, SpendReceiptReader } from "./spendReceipts.js";
import { createSupabasePersistenceModules } from "./supabase.js";

export type PersistenceModules = {
  readonly characterGeneration: CharacterGenerationStore;
  readonly endingSession: EndingSessionStore;
  readonly spendReceipts: SpendReceiptReader;
  /**
   * Side-branch AI option receipts only.
   * Not part of SpendReceiptReader: character/ending charge writes stay inside settle*.
   */
  readonly sideBranchSpend: SideBranchSpendRecorder;
};

export type ConfiguredPersistenceOptions = {
  readonly mode: "development" | "test" | "production";
  readonly supabaseUrl?: string;
  readonly serviceRoleKey?: string;
  readonly clientFactory?: typeof createClient;
};

/**
 * Build the three commercial persistence modules (plus side-branch receipt writer).
 * Source/config construction stays here — domain interfaces never read process.env.
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
