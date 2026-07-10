# @supaluv/content

Story packages, scene manifests, character locks, and Ink sources for SupaLuv.

## Responsibility

- Ship playable story sources (`ink/`, `manifests/`).
- Keep character lock packs (`characters/`) for consistent portraits.
- Hold noncanonical narrative drafts (`narrative/`).

## Not responsible

- React UI / audio playback / save system (web app).
- Canon finalization (still noncanonical drafts unless owner promotes).

## Entrypoints

| Path                       | Role                                       |
| -------------------------- | ------------------------------------------ |
| `src/index.ts`             | Package exports + story catalog            |
| `ink/ch01.ink`             | Chapter 01 densified playable script       |
| `manifests/ch01-scenes.ts` | Scene metadata aligned to Ink knots        |
| `characters/registry.ts`   | Speaker → stage side / default portrait    |
| `characters/suming/`       | Su Ming lock bible + prompts + refs        |
| `characters/lin_xiaotang/` | Lin lock (base)                            |
| `characters/zhou_lu/`      | Zhou lock (base)                           |
| `narrative/chapter-01/`    | Noncanonical novel + script densify source |

## Where next AI should edit for a new chapter

1. `narrative/chapter-XX/` novel + script
2. `ink/chXX.ink` with `# scene:<id>` tags
3. `manifests/chXX-scenes.ts` 1:1 with knots
4. Register in `src/index.ts` storyCatalog
5. Drop assets into `apps/web/public/assets/**`
6. Add/extend unit tests under `tests/unit/`

## Content pipeline (for next AI session)

```text
novel (narrative/chapter-XX/novel.md)
  -> script (narrative/chapter-XX/script.md)
  -> ink (ink/chXX.ink) with # scene:<id>
  -> manifests/chXX-scenes.ts (1:1 knot ids)
  -> portraits/audio/video under apps/web/public/assets
  -> storyCatalog entry in src/index.ts
```

## Verify

```bash
pnpm test   # includes ink/scene alignment unit tests
```

## Stability

`evolving` for Ch1 demo; `experimental` for later chapters until promoted.

Last reviewed: 2026-07-10
