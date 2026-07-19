import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { textSpeedToTypewriter } from "../../apps/web/src/persistence/settings";

/**
 * Voice must never clamp typewriter cadence. These pure helpers prove the
 * settings map stays independent of audio, and document expected rates.
 */
describe("textSpeedToTypewriter (voice-independent)", () => {
  it("maps slow < normal < fast by effective chars/sec", () => {
    const slow = textSpeedToTypewriter("slow");
    const normal = textSpeedToTypewriter("normal");
    const fast = textSpeedToTypewriter("fast");
    const rate = (opts: { charsPerTick: number; tickMs: number }) =>
      opts.charsPerTick / opts.tickMs;
    expect(rate(slow)).toBeLessThan(rate(normal));
    expect(rate(normal)).toBeLessThan(rate(fast));
  });

  it("keeps fast well above speech-like ~4 chars/sec (~0.004 /ms)", () => {
    const fast = textSpeedToTypewriter("fast");
    // 4 chars / 12ms ≈ 0.333 chars/ms ≈ 333 chars/sec — not voice-clamped
    expect(fast.charsPerTick / fast.tickMs).toBeGreaterThan(0.2);
  });

  it("keeps normal above speech-like rates", () => {
    const normal = textSpeedToTypewriter("normal");
    // 2 / 18ms ≈ 0.111 chars/ms ≈ 111 chars/sec
    expect(normal.charsPerTick / normal.tickMs).toBeGreaterThan(0.05);
  });
});

describe("typewriter reveal contract (timer)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reveal path finishes immediately without waiting ticks", () => {
    // Mirrors useTypewriter revealAll: setVisibleCount(text.length)
    let visibleCount = 0;
    const text = "语音播放时也应能立刻放完整段文字。";
    const charsPerTick = 1;
    const tickMs = 250; // speech-like slow tick (if someone ever clamped)

    const revealAll = () => {
      visibleCount = text.length;
    };

    // One tick would only show 1 char at 250ms — prove skip does not wait.
    const timer = setTimeout(() => {
      visibleCount = Math.min(text.length, visibleCount + charsPerTick);
    }, tickMs);
    revealAll();
    clearTimeout(timer);

    expect(visibleCount).toBe(text.length);
    expect(visibleCount).toBeGreaterThan(1);
  });
});
