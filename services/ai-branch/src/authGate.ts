import { createClient } from "@supabase/supabase-js";
import { firstDefinedEnv } from "@pieai/swimmer-ai-kit/env";
import { verifyAccessToken, type SwimmerAccessTokenProvider } from "@pieai/swimmer-backend-client";

export interface AuthGateResult {
  readonly ok: true;
  readonly userId: string;
  readonly isAnonymous: boolean;
}

export interface AuthGateFailure {
  readonly ok: false;
  readonly status: 401;
  readonly error: string;
}

/**
 * Verify a SwimmerBackend JWT from Authorization: Bearer …
 * Uses the shared SwimmerBackend online verifier with a publishable key — no
 * service_role in this path. Online verification rejects revoked sessions.
 */
export async function verifyBearerToken(
  authorizationHeader: string | undefined,
  provider?: SwimmerAccessTokenProvider,
): Promise<AuthGateResult | AuthGateFailure> {
  const raw = authorizationHeader?.trim() ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(raw);
  const token = match?.[1]?.trim();
  if (!token) {
    return { ok: false, status: 401, error: "Missing Authorization Bearer token" };
  }

  const url =
    firstDefinedEnv(process.env, [
      "SWIMMER_BACKEND_SUPABASE_URL",
      "VITE_SWIMMER_BACKEND_SUPABASE_URL",
      "VITE_SUPABASE_URL",
    ]) ?? "";
  const key =
    firstDefinedEnv(process.env, [
      "SWIMMER_BACKEND_PUBLISHABLE_KEY",
      "VITE_SWIMMER_BACKEND_PUBLISHABLE_KEY",
      "VITE_SUPABASE_ANON_KEY",
    ]) ?? "";

  if (!url || !key) {
    return {
      ok: false,
      status: 401,
      error: "Authentication is temporarily unavailable",
    };
  }

  const supabase =
    provider ??
    createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  let user;
  try {
    user = await verifyAccessToken(supabase, token);
  } catch {
    user = null;
  }
  if (!user) {
    return { ok: false, status: 401, error: "Invalid or expired session" };
  }

  return {
    ok: true,
    userId: user.id,
    isAnonymous: user.is_anonymous === true,
  };
}
