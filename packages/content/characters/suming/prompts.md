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
- Processing: assert the saved JPEG raw reference is already 832×1248; remove
  the balanced magenta key locally with the deterministic soft matte + despill
  tool; visually inspect the transparent PNG before replacing the stable
  runtime ID. Do not resize, regenerate, or reinterpret the face.
- Runtime fingerprints and release state live in
  `packages/content/assets/RUNTIME-ASSET-LEDGER.csv`.

## Runtime matte record (2026-07-13)

- Repaired runtime IDs: `suming-base`, `suming-shame`, `suming-panic`,
  `suming-lonely`, `suming-tempted`, and `suming-uncanny`.
- Accepted controls left byte-for-byte unchanged: `suming-committed` and
  `suming-restless`.
- Reproduction command:

  ```bash
  node tools/portrait-matte/process.mjs --write-runtime
  node tools/portrait-matte/calibrate.mjs --report .devspace-visual/portrait-matte/metrics/calibration.json
  node tools/portrait-matte/gate.mjs --report .devspace-visual/portrait-matte/metrics/gate.json
  node tools/portrait-matte/verify.mjs --report .devspace-visual/portrait-matte/metrics/verify.json
  ```

- Calibration: median RGB key from the top 10% raw strip; key-ray scale
  `0.25–1.5`; inner radius `max(14, top-strip p99 + 4)`; outer radius `48`;
  soft alpha blur sigma `0.7`; alpha clamps `≤3 → 0` and `≥252 → 255`;
  magenta despill above dominance `15` inside a 16-pixel boundary band.
- Gate: fixed 832×1248 dimensions, transparent top corners plus side
  background probes and top band, transparent/subject/partial-alpha coverage
  ranges calibrated from the two accepted controls, dominant-subject
  connectivity `≥0.99`, enclosed-transparent-hole limits, and boundary
  magenta-edge ratio `≤0.005`. The locked bust composition occupies both
  bottom canvas corners in the two accepted controls, so those exact pixels
  are recorded but are not misclassified as background probes.
- Determinism: `verify.mjs` generates into two fresh temporary directories,
  requires matching bytes/SHA-256 between both runs and the checked-in runtime
  files, and confirms that an opaque-magenta fixture fails the gate.
- Source type, authorization state, and commercial-review state are unchanged;
  only runtime pixel bytes, fingerprints, and processing notes changed.
