# 苏明 · Locked Prompts

## Base (only when recreating master)

Cinematic semi-realistic portrait of a tired Chinese male software engineer about 28 years old, thin face, dark under-eye circles, short messy black hair, wearing a plain gray hoodie, upper body bust, facing camera slightly left, soft key light, pure solid magenta #FF00FF background for chroma key, photoreal film still, consistent adult face, no anime style, no text, no logos

## Mood edit (always use base as reference image)

Keep the exact same face, age, hair, and gray hoodie as the reference. Only change expression to: {MOOD}. Upper body bust, pure solid magenta #FF00FF background, same camera framing, photoreal semi-realistic, no anime, no text

### Mood phrases

- shame: averted eyes, tight mouth, embarrassed
- panic: widened eyes looking aside, tense shoulders
- lonely: empty soft gaze downward
- restless: furrowed brows, restless jaw
- tempted: focused hungry eyes toward offscreen phone light
- uncanny: frozen half-smile, unsettled eyes
- committed: calm resolved expression, steady eyes

## Regeneration record (2026-07-11)

`committed` and `restless` previously duplicated the bytes of `lonely` and
`shame`. They were regenerated with the Codex built-in image generation tool,
using their existing raw portraits as identity/framing references.

- `committed`: change expression only to calm resolve, steady eyes looking
  slightly left of camera, relaxed closed mouth, subtle determination.
- `restless`: change expression only to furrowed brows, tense restless jaw and
  alert offscreen eyes; restrained realistic anxiety, not panic.
- Locked invariants: exact adult Chinese male identity, face proportions, age,
  hair, gray hoodie, lighting, 2:3 framing, and flat magenta chroma background;
  no text, logo, watermark or extra objects.
- Processing: resize to 832×1248; save the JPEG raw reference; remove the
  balanced magenta key locally with soft matte + despill; visually inspect the
  transparent PNG before replacing the stable runtime ID.
- Runtime fingerprints and release state live in
  `packages/content/assets/RUNTIME-ASSET-LEDGER.csv`.
