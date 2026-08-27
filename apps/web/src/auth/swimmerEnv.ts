/**
 * SwimmerBackend browser env for SupaLuv.
 * Read the canonical SwimmerBackend browser variables. Generic Supabase names
 * remain available for local tooling that has not yet been product-scoped.
 */

export interface SwimmerBrowserEnv {
  readonly url: string;
  readonly publishableKey: string;
}

export function readSwimmerBrowserEnv(): SwimmerBrowserEnv | null {
  const url = (
    (import.meta.env.VITE_SWIMMER_BACKEND_SUPABASE_URL as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
    ""
  ).trim();
  const publishableKey = (
    (import.meta.env.VITE_SWIMMER_BACKEND_PUBLISHABLE_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
    ""
  ).trim();

  if (!url.startsWith("http") || !publishableKey) {
    return null;
  }
  return { url, publishableKey };
}

export function isSwimmerAuthConfigured(): boolean {
  return readSwimmerBrowserEnv() !== null;
}
