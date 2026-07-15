import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createModulePreloader,
  preloadDecodedImage,
  waitForDocumentFonts,
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

  it("evicts a failed image so retry can decode a fresh request", async () => {
    let attempt = 0;
    const decode = vi.fn(async () => undefined);
    class FakeImage {
      decoding = "auto";
      fetchPriority = "auto";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      decode = decode;

      set src(_value: string) {
        attempt += 1;
        queueMicrotask(() => {
          if (attempt === 1) {
            this.onerror?.();
            return;
          }
          this.onload?.();
        });
      }
    }
    vi.stubGlobal("Image", FakeImage);

    await expect(preloadDecodedImage("/assets/test-atomic-retry.jpg")).rejects.toThrow(
      "Failed to load image",
    );
    await expect(preloadDecodedImage("/assets/test-atomic-retry.jpg")).resolves.toBeUndefined();

    expect(attempt).toBe(2);
    expect(decode).toHaveBeenCalledTimes(1);
  });

  it("includes document font readiness in the presentation gate", async () => {
    let markReady: (() => void) | undefined;
    const ready = new Promise<void>((resolve) => {
      markReady = resolve;
    });
    vi.stubGlobal("document", { fonts: { ready } });

    let settled = false;
    const waiting = waitForDocumentFonts().then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    markReady?.();
    await waiting;
    expect(settled).toBe(true);
  });
});
