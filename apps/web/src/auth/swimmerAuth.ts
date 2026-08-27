/**
 * SwimmerBackend Auth client for SupaLuv (Supabase Auth on shared project).
 * Session required for AI branch / future battery spend.
 *
 * Product owns browser client creation (URL + publishable key). Auth operations
 * route through `@pieai/swimmer-backend-client` `createAuthClient`. Public exports
 * still return Supabase `Session` / `User` because consumers (AuthContext) need
 * `session.access_token`; shared `AuthSessionRecord` intentionally omits tokens.
 */

import type { AuthClient } from "@pieai/swimmer-backend-client";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { createAuthClient, createClient } from "./swimmerAuthDeps";
import { readSwimmerBrowserEnv } from "./swimmerEnv";

let client: SupabaseClient | null = null;
let authClient: AuthClient | null = null;

export function getSwimmerSupabase(): SupabaseClient | null {
  if (client) {
    return client;
  }
  const env = readSwimmerBrowserEnv();
  if (!env) {
    return null;
  }
  client = createClient(env.url, env.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "supaluv.swimmer.auth.v1",
    },
  });
  authClient = createAuthClient(client);
  return client;
}

function getAuthClient(): AuthClient | null {
  if (authClient) {
    return authClient;
  }
  if (!getSwimmerSupabase()) {
    return null;
  }
  return authClient;
}

/**
 * Re-read the provider session (includes access_token).
 * Shared AuthSessionRecord strips tokens by design.
 */
async function readProviderSession(): Promise<Session | null> {
  const sb = getSwimmerSupabase();
  if (!sb) {
    return null;
  }
  const { data, error } = await sb.auth.getSession();
  if (error) {
    return null;
  }
  return data.session;
}

export async function getSession(): Promise<Session | null> {
  const auth = getAuthClient();
  if (!auth) {
    return null;
  }
  try {
    const record = await auth.getSession();
    if (!record) {
      return null;
    }
    return readProviderSession();
  } catch {
    return null;
  }
}

export async function getAccessToken(): Promise<string | null> {
  const auth = getAuthClient();
  if (!auth) {
    return null;
  }
  try {
    return await auth.getAccessToken();
  } catch {
    return null;
  }
}

export async function getUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}

/** One-tap guest identity on SwimmerBackend (still a real account row). */
export async function signInAnonymously(): Promise<Session> {
  const auth = getAuthClient();
  if (!auth) {
    throw new Error(
      "SwimmerBackend 未配置：请设置 VITE_SWIMMER_BACKEND_SUPABASE_URL / PUBLISHABLE_KEY",
    );
  }
  const record = await auth.signInAnonymously();
  if (!record) {
    throw new Error("匿名登录未返回会话");
  }
  const session = await readProviderSession();
  if (!session) {
    throw new Error("匿名登录未返回会话");
  }
  return session;
}

export async function signInWithEmail(email: string, password: string): Promise<Session> {
  const auth = getAuthClient();
  if (!auth) {
    throw new Error("SwimmerBackend 未配置");
  }
  // Product policy: try sign-in, then sign-up. Shared client keeps those actions separate.
  try {
    const signedIn = await auth.signInWithEmail(email, password);
    if (signedIn) {
      const session = await readProviderSession();
      if (session) {
        return session;
      }
    }
  } catch {
    // Fall through to sign-up (same as prior signInWithPassword error / missing session path).
  }
  const signedUp = await auth.signUpWithEmail(email, password);
  if (!signedUp) {
    throw new Error("请查收邮箱确认，或稍后重试登录");
  }
  const session = await readProviderSession();
  if (!session) {
    throw new Error("请查收邮箱确认，或稍后重试登录");
  }
  return session;
}

export async function signOut(): Promise<void> {
  const auth = getAuthClient();
  if (!auth) {
    return;
  }
  try {
    await auth.signOut();
  } catch {
    // Prior adapter ignored provider error objects; keep soft-fail.
  }
}

export function onAuthChange(listener: (session: Session | null) => void): () => void {
  const auth = getAuthClient();
  if (!auth) {
    return () => undefined;
  }
  // Shared listener payload is AuthSessionRecord (no tokens). Re-read provider Session
  // so AuthContext can keep reading session.access_token.
  const subscription = auth.onAuthStateChange((record) => {
    if (!record) {
      listener(null);
      return;
    }
    void readProviderSession().then((session) => {
      listener(session);
    });
  });
  return () => subscription.unsubscribe();
}

/**
 * Wallet balance via ai-branch edge (service_role on server).
 * Core wallet RPCs are service_role-only — never call them from the browser.
 * Returns null when offline / unauthenticated / optional unmetered.
 */
export async function fetchWalletBatteries(): Promise<number | null> {
  const token = await getAccessToken();
  if (!token) {
    return null;
  }
  const endpoint =
    (import.meta.env.VITE_SUPALUV_WALLET_URL as string | undefined)?.trim() ||
    "/api/wallet/balance";
  try {
    const response = await fetch(endpoint, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      return null;
    }
    const json = (await response.json()) as {
      batteries?: number | null;
      available?: boolean;
    };
    if (typeof json.batteries === "number" && Number.isFinite(json.batteries)) {
      return json.batteries;
    }
    return null;
  } catch {
    return null;
  }
}
