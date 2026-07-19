# Runtime public assets

Served as static files at `/assets/**` by the Vite web app.

## Layout (best practice)

```text
assets/
  audio/
    bgm/          # loopable beds (folder name frozen; concept = bed)
    sfx/          # one-shots
    voice/        # pregen dialogue clips (see pregenVoiceKey contract)
  portraits/      # character stills (official packs; portraitKey stems)
  scenes/         # scene stills (artKey stems)
  video/          # Event CG / cutscenes
```

## Naming rules

1. **Stable IDs, not pretty titles.** Runtime keys are `kebab-case` (`title-theme`,
   `night-ambient`). Human titles live in attribution docs.
2. **Channel by bed kind**, not by volume slider. Music vs ambient is decided in
   `apps/web/src/audio/audioCatalog.ts` (`AudioBedKind`).
3. **Content references IDs only.** Ink/scene manifests use `bgmKey` (legacy
   single bed) / `musicKey` / `ambientKey` / `sfxKey`. Runtime concept is **bed**.
   Never hardcode `/assets/...` in story.
4. **Replace in place when re-skinning.** Same ID, new file → no code change.
5. **Staging:** drop raw exports in repo-root `Temp/` first, then copy here with
   the final ID. Do not ship `Temp/` in production builds (gitignored).

## Current bed IDs (Ch01)

| ID              | Channel | Role                         |
| --------------- | ------- | ---------------------------- |
| `title-theme`   | music   | Title / menu                 |
| `soft-piano`    | music   | In-play score under dialogue |
| `chapter-end`   | music   | End card / aftertaste        |
| `night-ambient` | ambient | Office / public-space bed    |
| `lonely-pad`    | ambient | Apartment / private bed      |

Provenance: `packages/content/assets/ATTRIBUTION.md`.
