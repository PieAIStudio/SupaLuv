# SupaLuv

SupaLuv is an independent AI-assisted interactive cinema game project. It is not
the Supa card game and does not inherit Supa's card, Boss Race, or multiplayer
systems.

The current working discussion brief is documented in
`docs/reference/strategy/supaluv-interactive-cinema-discussion-brief.md`.
It is not a final strategy or active implementation spec.

AI agents should start from `AGENTS.md`, not this README. Governed project
documentation lives under `docs/**`; product source assets and generated media
may live outside `docs/**` when the project later adds runtime packages.

## Current Working Direction

- Web-first independent game.
- Ink / InkJS for authored branching narrative.
- React / Vite / TypeScript for the app shell and player UI.
- Pixi'VN or a thin Pixi/React layer for visual-novel-style staging after the
  text prototype proves itself.
- HTML video for authored AIGC cutscenes.
- AI-assisted authoring first; constrained runtime AI branches only after safety
  and platform guardrails are proven.
- Portable content metadata so the project can later move to Unity, Godot,
  Ren'Py, or another engine without losing story structure.

This direction is still being debated. Promote it into an accepted decision,
active spec, or implementation plan only after owner approval.

## Governance

This repository uses Project Governance System with the `engineering-runtime`
profile.

Useful commands:

```bash
pnpm doc-gov find <topic>
pnpm doc-gov new <type> <slug>
pnpm governance:check
```
