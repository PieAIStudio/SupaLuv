import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyBearerToken } from "../../services/ai-branch/src/authGate";

const USER_ID = "11111111-1111-4111-8111-111111111111";

describe("SwimmerBackend auth gate", () => {
  const getUser = vi.fn<(token: string) => Promise<unknown>>();
  const provider = { auth: { getUser } };

  beforeEach(() => {
    vi.stubEnv("SWIMMER_BACKEND_SUPABASE_URL", "https://auth.invalid");
    vi.stubEnv("SWIMMER_BACKEND_PUBLISHABLE_KEY", "publishable-test-key");
    getUser.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("delegates bearer-token verification to the shared online verifier", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: USER_ID, is_anonymous: true } },
      error: null,
    });

    const result = await verifyBearerToken("Bearer access-token", provider as never);

    expect(getUser).toHaveBeenCalledWith("access-token");
    expect(result).toEqual({ ok: true, userId: USER_ID, isAnonymous: true });
  });

  it("maps provider failures to a stable unauthorized response", async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("provider detail must stay private"),
    });

    await expect(verifyBearerToken("Bearer invalid-token", provider as never)).resolves.toEqual({
      ok: false,
      status: 401,
      error: "Invalid or expired session",
    });
  });

  it("does not call the provider when the bearer token is missing", async () => {
    await expect(verifyBearerToken(undefined, provider as never)).resolves.toEqual({
      ok: false,
      status: 401,
      error: "Missing Authorization Bearer token",
    });
    expect(getUser).not.toHaveBeenCalled();
  });
});
