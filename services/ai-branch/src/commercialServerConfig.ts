/**
 * Server-only commercial credential resolver.
 *
 * Canonical variables:
 * - SWIMMER_BACKEND_SUPABASE_URL
 * - SWIMMER_BACKEND_SECRET_KEY
 *
 * The former SWIMMER_CORE_* names remain temporary compatibility aliases while
 * deployments rotate their environment names.
 *
 * Browser-prefixed and generic service-role aliases are intentionally ignored.
 * Used by wallet metering and commercial route runtime so both agree on
 * configured vs unconfigured state.
 */

import { firstDefinedEnv } from "@pieai/swimmer-ai-kit/env";

export type CommercialServerCredentials = {
  readonly supabaseUrl: string;
  readonly serviceRoleKey: string;
};

/** Minimal env-like source; defaults to process.env in production paths. */
export type CommercialServerCredentialSource = {
  readonly SWIMMER_BACKEND_SUPABASE_URL?: string;
  readonly SWIMMER_BACKEND_SECRET_KEY?: string;
  /** Temporary compatibility aliases for the former shared-platform name. */
  readonly SWIMMER_CORE_SUPABASE_URL?: string;
  readonly SWIMMER_CORE_SECRET_KEY?: string;
};

/**
 * Resolve trimmed URL + service-role key. Returns null unless both canonical
 * values are present and non-empty after trim.
 */
export function resolveCommercialServerCredentials(
  source: CommercialServerCredentialSource = process.env,
): CommercialServerCredentials | null {
  const supabaseUrl =
    firstDefinedEnv(source, ["SWIMMER_BACKEND_SUPABASE_URL", "SWIMMER_CORE_SUPABASE_URL"]) ?? "";
  const serviceRoleKey =
    firstDefinedEnv(source, ["SWIMMER_BACKEND_SECRET_KEY", "SWIMMER_CORE_SECRET_KEY"]) ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return { supabaseUrl, serviceRoleKey };
}

export function commercialServerCredentialsConfigured(
  source: CommercialServerCredentialSource = process.env,
): boolean {
  return resolveCommercialServerCredentials(source) !== null;
}
