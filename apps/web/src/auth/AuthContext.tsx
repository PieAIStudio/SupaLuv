import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  fetchWalletBatteries,
  getSession,
  isAuthConfigured,
  onAuthChange,
  signInAnonymously,
  signInWithEmail,
  signOut,
} from "./authApi";

export interface AuthState {
  readonly configured: boolean;
  readonly ready: boolean;
  readonly session: Session | null;
  readonly user: User | null;
  readonly batteries: number | null;
  readonly busy: boolean;
  readonly error: string | null;
  /** True when a SwimmerBackend session exists (anonymous counts). */
  readonly isSignedIn: boolean;
  signInGuest: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * supabase-js can hang after a 200 (session persistence / navigator.locks
 * multi-tab contention), which would leave `busy` stuck forever. Every busy
 * flow races against this guard so the UI always recovers; if auth actually
 * succeeded, onAuthChange still delivers the session afterwards.
 */
const AUTH_FLOW_TIMEOUT_MS = 12_000;

async function withAuthTimeout<T>(work: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label}超时，请重试（若已登录会自动恢复）`)),
          AUTH_FLOW_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isAuthConfigured();
  const [ready, setReady] = useState(!configured);
  const [session, setSession] = useState<Session | null>(null);
  const [batteries, setBatteries] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshWallet = useCallback(async () => {
    if (!session) {
      setBatteries(null);
      return;
    }
    const next = await fetchWalletBatteries();
    setBatteries(next);
  }, [session]);

  useEffect(() => {
    if (!configured) {
      setReady(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      const current = await getSession();
      if (!cancelled) {
        setSession(current);
        setReady(true);
      }
    })();
    const unsub = onAuthChange((next) => {
      setSession(next);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [configured]);

  useEffect(() => {
    void refreshWallet();
  }, [refreshWallet]);

  const signInGuest = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await withAuthTimeout(signInAnonymously(), "游客登录");
      setSession(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
      throw err;
    } finally {
      setBusy(false);
    }
  }, []);

  const signInEmail = useCallback(async (email: string, password: string) => {
    setBusy(true);
    setError(null);
    try {
      const next = await withAuthTimeout(signInWithEmail(email, password), "登录");
      setSession(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
      throw err;
    } finally {
      setBusy(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await withAuthTimeout(signOut(), "退出登录");
      setSession(null);
      setBatteries(null);
    } finally {
      setBusy(false);
    }
  }, []);

  const getAccessToken = useCallback(async () => session?.access_token ?? null, [session]);

  const value = useMemo<AuthState>(
    () => ({
      configured,
      ready,
      session,
      user: session?.user ?? null,
      batteries,
      busy,
      error,
      isSignedIn: Boolean(session?.user),
      signInGuest,
      signInEmail,
      signOutUser,
      refreshWallet,
      getAccessToken,
    }),
    [
      batteries,
      busy,
      configured,
      error,
      getAccessToken,
      ready,
      refreshWallet,
      session,
      signInEmail,
      signInGuest,
      signOutUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
