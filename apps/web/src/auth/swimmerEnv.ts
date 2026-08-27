/**
 * SwimmerBackend browser env for SupaLuv.
 * Prefer VITE_SWIMMER_BACKEND_*; keep the former SwimmerCore names and the
 * generic Supabase names as temporary compatibility fallbacks.
 */

export interface SwimmerBrowserEnv {
  readonly url: string;
  readonly publishableKey: string;
}

export function readSwimmerBrowserEnv(): SwimmerBrowserEnv | null {
  const url = (
    (import.meta.env.VITE_SWIMMER_BACKEND_SUPABASE_URL as string | undefined) ||
    (import.meta.env.VITE_SWIMMER_CORE_SUPABASE_URL as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
    ""
  ).trim();
  const publishableKey = (
    (import.meta.env.VITE_SWIMMER_BACKEND_PUBLISHABLE_KEY as string | undefined) ||
    (import.meta.env.VITE_SWIMMER_CORE_PUBLISHABLE_KEY as string | undefined) ||
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
