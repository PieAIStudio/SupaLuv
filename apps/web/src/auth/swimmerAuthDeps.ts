/**
 * Injectable dependency seam for unit tests.
 * Production code re-exports shared auth + Supabase factories from here so
 * tests can mock a relative module path (package-name mocks are flaky under pnpm).
 */
export { createAuthClient } from "@pieai/swimmer-backend-client";
export { createClient } from "@supabase/supabase-js";
