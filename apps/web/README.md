# @supaluv/web

SupaLuv browser runtime: interactive cinema shell for the default draft package
(`draft-ch01` → `draft-ch02`). Production loads precompiled Ink JSON; chapter 1
checkpoint advances into chapter 2 without AI final ending.

## Responsibility

- Own the playable product shell (title, play, save/load, settings, gallery, help).
- Compose SwimmerUIKit brand components for HUD / modals / history / callouts.
- Drive InkJS story snapshots into a 16:9 VN stage.
- Optional co-play (BroadcastChannel local + Realtime opt-in); solo offline always works.

## Not responsible

- Long-form canon writing (`packages/content/narrative/`).
- Shared brand component **implementation** (SwimmerUIKit — pin npm version or verified tarball).
- Cloud multiplayer authority servers / public free-form AI novel.

## Entrypoints (AI session map)

| Path                                 | Role                                                      | Keep thin?                            |
| ------------------------------------ | --------------------------------------------------------- | ------------------------------------- |
| `src/main.tsx`                       | Providers + mount                                         | yes                                   |
| `src/App.tsx`                        | Screen routing, atomic load lock, co-play, shell chrome   | yes — story domain in `story/session` |
| `src/story/session/*`                | **StorySession**: runner, save/resume, chapter transition | deep module; React adapter only       |
| `src/views/VisualNovelPrototype.tsx` | Play stage **composition only**                           | **yes — do not re-grow grab bag**     |
| `src/views/play/*`                   | HUD, dialogue, choice flow, stage media, pointers         | preferred growth zone                 |
| `src/coplay/*`                       | Protocol, presence, RPS, transports, pointer policy       | no Supabase in DialoguePanel          |
| `src/persistence/*`                  | save schema / settings / unlocks / achievements           | stable contracts                      |
| `src/audio/*`                        | Howler façade + reverb engine                             | only Howler import in howlerEngine    |
| `src/auth/*`                         | SwimmerCore browser auth; wallet **read via edge**        | never service_role                    |
| `src/commerce/*`                     | Battery pitch copy                                        | pure strings                          |
| `src/ai/*`                           | AI branch client providers                                | mock only if FORCE_MOCK               |
| `src/hooks/*`                        | Cross-view hooks (AI slot, typewriter, fullscreen…)       | no JSX                                |
| `src/story/*`                        | Multi-chapter Ink runner (compiled JSON) + map adapter    | content-facing                        |

## Seam rules (refactor doctrine)

1. **Do not grow `VisualNovelPrototype.tsx` into a grab bag.**
   - Choice / RPS → `views/play/usePlayChoiceFlow.ts`
   - Beds / CG / SFX → `views/play/useStageMedia.ts`
   - Co-play pointers → `views/play/useCoPlayPointers.ts`
   - Pure continue labels → `views/play/vnHelpers.ts`
2. **Story domain lives in `StorySession`** (`story/session/createStorySession.ts`).
   App calls the session interface; it does not re-own runner/snapshot/save orchestration.
3. **Saves are written only through `writeStorySave`** (`persistence/saveWriter.ts`),
   invoked inside StorySession — never assembled field-by-field in App.
4. **Scene → gallery unlocks** via `persistence/sceneUnlocks.ts` (pure), applied by StorySession.
5. **SwimmerUIKit** for brand controls; **local `styles.css`** only for cinema stage theme.
6. **Behavior is the contract** — unit-test StorySession + pure modules; e2e for shell path.
7. **Content drop** = Ink + scene manifest + assets — not shell rewrite.
8. **Dynamic chunking** — never statically import the compiled Ink runtime into the entry bundle
   (`story/session/storyRuntime.ts` remains lazy).

## Module map (where to change what)

| If you need to…              | Edit                                                               |
| ---------------------------- | ------------------------------------------------------------------ |
| Add a meta screen            | `views/<Screen>.tsx` + route in `App.tsx`                          |
| Play HUD / system menu       | `views/play/PlayHud.tsx`, `SystemMenu.tsx`                         |
| Dialogue + AI choice UI      | `views/play/DialoguePanel.tsx`                                     |
| Host/guest choice + RPS      | `views/play/usePlayChoiceFlow.ts`                                  |
| Cutscene / BGM / SFX timing  | `views/play/useStageMedia.ts`                                      |
| Shared cursor / touch focus  | `coplay/pointerPolicy.ts` + `useCoPlayPointers.ts`                 |
| Save / resume / chapter flow | `story/session/*` + `persistence/gameSave.ts` + `saveWriter.ts`    |
| Save schema                  | `persistence/gameSave.ts` + `saveWriter.ts` + tests                |
| Settings values              | `persistence/settings.ts` + `views/settings/*` (player vs lab)     |
| Local cinema CSS             | `styles/{base,stage,meta,coplay,chrome}.css` (barrel `styles.css`) |
| Co-play RPS presentation     | `coplay/rpsViewModel.ts`                                           |
| Audio play/pan/reverb        | `audio/gameAudio.ts` + `howlerEngine.ts`                           |
| Battery pitch copy           | `commerce/aiBatteryPitch.ts`                                       |
| AI edge HTTP                 | `services/ai-branch/src/routeTable.ts` (not `server.ts`)           |
| Wallet reserve/commit        | `services/ai-branch/src/walletMeter.ts`                            |
| TTS fixed phrases            | `services/ai-branch/src/ttsCatalog.ts`                             |
| Story content                | **`packages/content`**                                             |

## AI edge map (`services/ai-branch`)

| File                             | Role                                                              |
| -------------------------------- | ----------------------------------------------------------------- |
| `server.ts`                      | secrets + listen only                                             |
| `routeTable.ts`                  | all HTTP endpoints                                                |
| `walletMeter.ts`                 | service_role reserve/commit/refund                                |
| `persistence/`                   | commercial modules: character settle, ending settle, spend reader |
| `ttsCatalog.ts`                  | trusted preview phrases                                           |
| `authGate.ts`                    | JWT verify (publishable key)                                      |
| `handler.ts` / `mastraBranch.ts` | constrained AI generation                                         |

## Stability

| Area                           | Stability                      |
| ------------------------------ | ------------------------------ |
| Solo play + save/settings      | stable                         |
| Constrained AI side branch     | stable (auth + optional meter) |
| Local co-play BroadcastChannel | experimental                   |
| Cloud Realtime co-play         | experimental                   |
| Live battery debit             | requires Core secret + app id  |

## Verify

```bash
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Last reviewed: 2026-07-13
