/**
 * Server-only commercial credential resolver.
 *
 * Canonical variables only:
 * - SWIMMER_CORE_SUPABASE_URL
 * - SWIMMER_CORE_SECRET_KEY
 *
 * Browser-prefixed and generic service-role aliases are intentionally ignored.
 * Used by wallet metering and commercial route runtime so both agree on
 * configured vs unconfigured state.
 */

export type CommercialServerCredentials = {
  readonly supabaseUrl: string;
  readonly serviceRoleKey: string;
};

/** Minimal env-like source; defaults to process.env in production paths. */
export type CommercialServerCredentialSource = {
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
  const supabaseUrl = source.SWIMMER_CORE_SUPABASE_URL?.trim() ?? "";
  const serviceRoleKey = source.SWIMMER_CORE_SECRET_KEY?.trim() ?? "";
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
