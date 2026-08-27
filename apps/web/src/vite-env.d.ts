/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
  readonly VITE_ENABLE_POSTHOG?: string;
  readonly VITE_SWIMMER_BACKEND_SUPABASE_URL?: string;
  readonly VITE_SWIMMER_BACKEND_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Optional deployment/test override: `broadcast` or `realtime`. */
  readonly VITE_SUPALUV_COPLAY_TRANSPORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
