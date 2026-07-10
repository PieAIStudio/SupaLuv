/**
 * SwimmerCore Auth client for SupaLuv (Supabase Auth on shared project).
 * Session required for AI branch / future battery spend.
 */

import { createClient, type Session, type SupabaseClient, type User } from "@supabase/supabase-js";
import { readSwimmerBrowserEnv } from "./swimmerEnv";

let client: SupabaseClient | null = null;

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
  return client;
}

export async function getSession(): Promise<Session | null> {
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

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? null;
}

export async function getUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}

/** One-tap guest identity on SwimmerCore (still a real account row). */
export async function signInAnonymously(): Promise<Session> {
  const sb = getSwimmerSupabase();
  if (!sb) {
    throw new Error("SwimmerCore 未配置：请设置 VITE_SWIMMER_CORE_SUPABASE_URL / PUBLISHABLE_KEY");
  }
  const { data, error } = await sb.auth.signInAnonymously();
  if (error) {
    throw error;
  }
  if (!data.session) {
    throw new Error("匿名登录未返回会话");
  }
  return data.session;
}

export async function signInWithEmail(email: string, password: string): Promise<Session> {
  const sb = getSwimmerSupabase();
  if (!sb) {
    throw new Error("SwimmerCore 未配置");
  }
  const signIn = await sb.auth.signInWithPassword({ email, password });
  if (!signIn.error && signIn.data.session) {
    return signIn.data.session;
  }
  const signUp = await sb.auth.signUp({ email, password });
  if (signUp.error) {
    throw signUp.error;
  }
  if (!signUp.data.session) {
    throw new Error("请查收邮箱确认，或稍后重试登录");
  }
  return signUp.data.session;
}

export async function signOut(): Promise<void> {
  const sb = getSwimmerSupabase();
  if (!sb) {
    return;
  }
  await sb.auth.signOut();
}

export function onAuthChange(listener: (session: Session | null) => void): () => void {
  const sb = getSwimmerSupabase();
  if (!sb) {
    return () => undefined;
  }
  const {
    data: { subscription },
  } = sb.auth.onAuthStateChange((_event, session) => {
    listener(session);
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
