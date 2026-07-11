import { describe, expect, it, vi } from "vitest";
import {
  CharacterPackApiError,
  createCharacterPackClient,
} from "../../apps/web/src/characters/characterPackClient";

function json(status: number, value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("character pack browser client", () => {
  it("sends bearer auth and stable client action ids", async () => {
    const fetchImpl = vi.fn(async () =>
      json(200, { asset: { id: "asset-1", url: "https://signed" } }),
    );
    const client = createCharacterPackClient({
      getAccessToken: async () => "access-token",
      fetchImpl,
      baseUrl: "/api",
    });

    await client.generateBase("pack-1", {
      clientActionId: "action-1",
      kind: "human",
      prompt: "adult portrait",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/ai/characters/packs/pack-1/base",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer access-token" }),
        body: JSON.stringify({
          clientActionId: "action-1",
          kind: "human",
          prompt: "adult portrait",
        }),
      }),
    );
  });

  it("performs signed upload then server-side finalize", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        json(201, {
          assetId: "2f06f160-45c0-4ef8-96df-212673fc134c",
          storagePath: "owner/pack/references/ref.jpg",
          signedUrl: "https://storage.invalid/upload",
          token: "token",
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(json(200, { id: "asset-1" }));
    const client = createCharacterPackClient({
      getAccessToken: async () => "token",
      fetchImpl,
      baseUrl: "/api",
    });
    const file = new File(["photo"], "me.jpg", { type: "image/jpeg" });

    await client.uploadReference("pack-1", "reference-1", file);

    expect(fetchImpl.mock.calls[1]?.[0]).toBe("https://storage.invalid/upload");
    expect(fetchImpl.mock.calls[2]?.[1]).toMatchObject({ method: "POST" });
    expect(JSON.parse(String(fetchImpl.mock.calls[2]?.[1]?.body))).toMatchObject({
      packId: "pack-1",
      storagePath: "owner/pack/references/ref.jpg",
      sizeBytes: file.size,
    });
  });

  it("maps HTTP failures and forwards AbortSignal", async () => {
    const fetchImpl = vi.fn(async () => json(402, { error: "INSUFFICIENT" }));
    const client = createCharacterPackClient({ getAccessToken: async () => "token", fetchImpl });
    const controller = new AbortController();

    await expect(
      client.generateBase("pack-1", {
        clientActionId: "action-1",
        kind: "human",
        prompt: "portrait",
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ status: 402, code: "INSUFFICIENT" });
    const firstCall = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(firstCall[1].signal).toBe(controller.signal);
    expect(new CharacterPackApiError(409, "BUSY")).toBeInstanceOf(Error);
  });
});
