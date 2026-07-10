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
  /** True when a SwimmerCore session exists (anonymous counts). */
  readonly isSignedIn: boolean;
  signInGuest: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthState | null>(null);

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
      const next = await signInAnonymously();
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
      const next = await signInWithEmail(email, password);
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
      await signOut();
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
