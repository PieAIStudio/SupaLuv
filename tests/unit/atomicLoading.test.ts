import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createModulePreloader,
  preloadDecodedImage,
} from "../../apps/web/src/loading/atomicLoading";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("atomic loading helpers", () => {
  it("deduplicates an in-flight module load", async () => {
    const loader = vi.fn(async () => ({ ready: true }));
    const preload = createModulePreloader(loader);

    const [first, second] = await Promise.all([preload(), preload()]);

    expect(first).toBe(second);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("allows retry after a failed module load", async () => {
    const loader = vi
      .fn<() => Promise<{ ready: boolean }>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ ready: true });
    const preload = createModulePreloader(loader);

    await expect(preload()).rejects.toThrow("offline");
    await expect(preload()).resolves.toEqual({ ready: true });
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("waits for image decode and reuses the decoded result", async () => {
    const decode = vi.fn(async () => undefined);
    class FakeImage {
      decoding = "auto";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      decode = decode;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", FakeImage);

    await Promise.all([
      preloadDecodedImage("/assets/test-atomic-a.jpg"),
      preloadDecodedImage("/assets/test-atomic-a.jpg"),
    ]);

    expect(decode).toHaveBeenCalledTimes(1);
  });
});
