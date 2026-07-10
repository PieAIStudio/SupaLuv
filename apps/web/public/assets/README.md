# Runtime public assets

Served as static files at `/assets/**` by the Vite web app.

## Layout (best practice)

```text
assets/
  audio/
    bgm/          # loopable beds — id = filename without .mp3
    sfx/          # one-shots
    voice/        # reserved: per-line VO / TTS cache later
  portraits/      # character stills (official packs)
  scenes/         # background stills
  video/          # Event CG / cutscenes
```

## Naming rules

1. **Stable IDs, not pretty titles.** Runtime keys are `kebab-case` (`title-theme`,
   `night-ambient`). Human titles live in attribution docs.
2. **Channel by folder + key class**, not by volume slider. Music vs ambient is
   decided in `gameAudio.ts` (`MUSIC_KEYS` / `AMBIENT_KEYS`).
3. **Content references IDs only.** Ink/scene manifests use `bgmKey` /
   `musicKey` / `ambientKey` / `sfxKey`. Never hardcode `/assets/...` in story.
4. **Replace in place when re-skinning.** Same ID, new file → no code change.
5. **Staging:** drop raw exports in repo-root `Temp/` first, then copy here with
   the final ID. Do not ship `Temp/` in production builds (gitignored).

## Current BGM IDs (Ch01)

| ID              | Channel | Role                         |
| --------------- | ------- | ---------------------------- |
| `title-theme`   | music   | Title / menu                 |
| `soft-piano`    | music   | In-play score under dialogue |
| `chapter-end`   | music   | End card / aftertaste        |
| `night-ambient` | ambient | Office / public-space bed    |
| `lonely-pad`    | ambient | Apartment / private bed      |

Provenance: `packages/content/assets/ATTRIBUTION.md`.
