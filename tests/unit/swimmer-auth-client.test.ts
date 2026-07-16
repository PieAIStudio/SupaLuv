import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type TestUser = {
  id: string;
  email?: string | null;
  is_anonymous?: boolean | null;
};

type TestSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: TestUser;
};

const {
  createAuthClientMock,
  createClientMock,
  readSwimmerBrowserEnvMock,
  authMethods,
  providerAuth,
} = vi.hoisted(() => {
  const providerAuth = {
    getSession: vi.fn(),
    getUser: vi.fn(),
    onAuthStateChange: vi.fn(),
    signInAnonymously: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    updateUser: vi.fn(),
    signOut: vi.fn(),
  };

  const authMethods = {
    getSession: vi.fn(),
    getAccessToken: vi.fn(),
    getCurrentUser: vi.fn(),
    onAuthStateChange: vi.fn(),
    signInAnonymously: vi.fn(),
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    linkEmail: vi.fn(),
    signOut: vi.fn(),
  };

  return {
    createAuthClientMock: vi.fn(() => authMethods),
    createClientMock: vi.fn(() => ({ auth: providerAuth })),
    readSwimmerBrowserEnvMock: vi.fn(() => ({
      url: "https://auth.example.test",
      publishableKey: "publishable-test-key",
    })),
    authMethods,
    providerAuth,
  };
});

vi.mock("../../apps/web/src/auth/swimmerAuthDeps", () => ({
  createAuthClient: createAuthClientMock,
  createClient: createClientMock,
}));

vi.mock("../../apps/web/src/auth/swimmerEnv", () => ({
  readSwimmerBrowserEnv: readSwimmerBrowserEnvMock,
}));

function fullSession(overrides: Partial<TestSession> = {}): TestSession {
  return {
    access_token: "access-token-value",
    refresh_token: "refresh-token-value",
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id: "user-1",
      email: "a@example.com",
      is_anonymous: false,
    },
    ...overrides,
  };
}

describe("swimmerAuth createAuthClient adapter", () => {
  beforeEach(() => {
    vi.resetModules();
    createAuthClientMock.mockClear();
    createClientMock.mockClear();
    readSwimmerBrowserEnvMock.mockClear();
    readSwimmerBrowserEnvMock.mockReturnValue({
      url: "https://auth.example.test",
      publishableKey: "publishable-test-key",
    });
    for (const fn of Object.values(authMethods)) {
      fn.mockReset();
    }
    for (const fn of Object.values(providerAuth)) {
      fn.mockReset();
    }
    createAuthClientMock.mockImplementation(() => authMethods);
    createClientMock.mockImplementation(() => ({ auth: providerAuth }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("wires createAuthClient with the product Supabase client", async () => {
    const { getSwimmerSupabase } = await import("../../apps/web/src/auth/swimmerAuth");
    const sb = getSwimmerSupabase();
    expect(sb).not.toBeNull();
    expect(createClientMock).toHaveBeenCalledWith(
      "https://auth.example.test",
      "publishable-test-key",
      expect.objectContaining({
        auth: expect.objectContaining({
          persistSession: true,
          storageKey: "supaluv.swimmer.auth.v1",
        }),
      }),
    );
    expect(createAuthClientMock).toHaveBeenCalledWith(sb);
  });

  it("returns the full provider Session (with access_token) after anonymous sign-in", async () => {
    const session = fullSession({
      user: { id: "anon-1", is_anonymous: true },
    });
    authMethods.signInAnonymously.mockResolvedValue({
      user: { id: "anon-1", is_anonymous: true },
    });
    providerAuth.getSession.mockResolvedValue({
      data: { session },
      error: null,
    });

    const { signInAnonymously } = await import("../../apps/web/src/auth/swimmerAuth");
    await expect(signInAnonymously()).resolves.toEqual(session);
    expect(authMethods.signInAnonymously).toHaveBeenCalledOnce();
    expect(providerAuth.getSession).toHaveBeenCalled();
  });

  it("uses shared getAccessToken without exposing tokens on AuthSessionRecord", async () => {
    authMethods.getAccessToken.mockResolvedValue("access-token-value");
    const { getAccessToken } = await import("../../apps/web/src/auth/swimmerAuth");
    await expect(getAccessToken()).resolves.toBe("access-token-value");
    expect(authMethods.getAccessToken).toHaveBeenCalledOnce();
  });

  it("keeps product email sign-in → sign-up fallback policy", async () => {
    const session = fullSession();
    authMethods.signInWithEmail.mockRejectedValue(new Error("Invalid login credentials"));
    authMethods.signUpWithEmail.mockResolvedValue({
      user: { id: "user-1", email: "a@example.com", is_anonymous: false },
    });
    providerAuth.getSession.mockResolvedValue({
      data: { session },
      error: null,
    });

    const { signInWithEmail } = await import("../../apps/web/src/auth/swimmerAuth");
    await expect(signInWithEmail("a@example.com", "pw")).resolves.toEqual(session);
    expect(authMethods.signInWithEmail).toHaveBeenCalledWith("a@example.com", "pw");
    expect(authMethods.signUpWithEmail).toHaveBeenCalledWith("a@example.com", "pw");
  });

  it("re-reads provider Session for onAuthChange listeners", async () => {
    const session = fullSession();
    let sharedListener: ((record: { user: { id: string } } | null) => void) | undefined;
    authMethods.onAuthStateChange.mockImplementation((listener) => {
      sharedListener = listener;
      return { unsubscribe: vi.fn() };
    });
    providerAuth.getSession.mockResolvedValue({
      data: { session },
      error: null,
    });

    const { onAuthChange } = await import("../../apps/web/src/auth/swimmerAuth");
    const received: Array<TestSession | null> = [];
    onAuthChange((next) => {
      received.push(next as TestSession | null);
    });

    sharedListener?.({ user: { id: "user-1" } });
    await vi.waitFor(() => {
      expect(received).toEqual([session]);
    });
    expect(received[0]?.access_token).toBe("access-token-value");
  });

  it("soft-fails signOut when the shared client throws", async () => {
    authMethods.signOut.mockRejectedValue(new Error("network"));
    const { signOut } = await import("../../apps/web/src/auth/swimmerAuth");
    await expect(signOut()).resolves.toBeUndefined();
  });

  it("returns null session helpers when Swimmer env is missing", async () => {
    readSwimmerBrowserEnvMock.mockReturnValue(null as never);
    const mod = await import("../../apps/web/src/auth/swimmerAuth");
    expect(mod.getSwimmerSupabase()).toBeNull();
    await expect(mod.getSession()).resolves.toBeNull();
    await expect(mod.getAccessToken()).resolves.toBeNull();
    await expect(mod.signInAnonymously()).rejects.toThrow(/未配置/);
  });
});
