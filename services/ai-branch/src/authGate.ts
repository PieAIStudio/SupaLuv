import { createClient } from "@supabase/supabase-js";

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
 * Verify SwimmerCore JWT from Authorization: Bearer …
 * Uses publishable key + getUser(jwt) — no service_role in this path.
 */
export async function verifyBearerToken(
  authorizationHeader: string | undefined,
): Promise<AuthGateResult | AuthGateFailure> {
  const raw = authorizationHeader?.trim() ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(raw);
  const token = match?.[1]?.trim();
  if (!token) {
    return { ok: false, status: 401, error: "Missing Authorization Bearer token" };
  }

  const url = (
    process.env.SWIMMER_CORE_SUPABASE_URL ||
    process.env.VITE_SWIMMER_CORE_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ""
  ).trim();
  const key = (
    process.env.SWIMMER_CORE_PUBLISHABLE_KEY ||
    process.env.VITE_SWIMMER_CORE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ""
  ).trim();

  if (!url || !key) {
    return {
      ok: false,
      status: 401,
      error: "Authentication is temporarily unavailable",
    };
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, status: 401, error: "Invalid or expired session" };
  }

  return {
    ok: true,
    userId: data.user.id,
    isAnonymous: data.user.is_anonymous === true,
  };
}
