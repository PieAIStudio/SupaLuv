# @supaluv/web

SupaLuv browser runtime: interactive cinema shell for Chapter 01 demo.

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

| Path                                 | Role                                                 | Keep thin?                                  |
| ------------------------------------ | ---------------------------------------------------- | ------------------------------------------- |
| `src/main.tsx`                       | Providers + mount                                    | yes                                         |
| `src/App.tsx`                        | Screen routing + save orchestration + co-play config | yes — pure save in `persistence/saveWriter` |
| `src/views/VisualNovelPrototype.tsx` | Play stage **composition only**                      | **yes — do not re-grow grab bag**           |
| `src/views/play/*`                   | HUD, dialogue, choice flow, stage media, pointers    | preferred growth zone                       |
| `src/coplay/*`                       | Protocol, presence, RPS, transports, pointer policy  | no Supabase in DialoguePanel                |
| `src/persistence/*`                  | save / settings / unlocks / achievements             | stable contracts                            |
| `src/audio/*`                        | Howler façade + reverb engine                        | only Howler import in howlerEngine          |
| `src/auth/*`                         | SwimmerCore browser auth; wallet **read via edge**   | never service_role                          |
| `src/commerce/*`                     | Battery pitch copy                                   | pure strings                                |
| `src/ai/*`                           | AI branch client providers                           | mock only if FORCE_MOCK                     |
| `src/hooks/*`                        | Cross-view hooks (AI slot, typewriter, fullscreen…)  | no JSX                                      |
| `src/story/*`                        | Ink runner + scene presentation adapter              | content-facing                              |

## Seam rules (refactor doctrine)

1. **Do not grow `VisualNovelPrototype.tsx` into a grab bag.**
   - Choice / RPS → `views/play/usePlayChoiceFlow.ts`
   - Beds / CG / SFX → `views/play/useStageMedia.ts`
   - Co-play pointers → `views/play/useCoPlayPointers.ts`
   - Pure continue labels → `views/play/vnHelpers.ts`
2. **App writes saves only through `writeStorySave`** (`persistence/saveWriter.ts`).
3. **Scene → gallery unlocks** via `persistence/sceneUnlocks.ts` (pure).
4. **SwimmerUIKit** for brand controls; **local `styles.css`** only for cinema stage theme.
5. **Behavior is the contract** — unit-test pure modules; e2e for shell path.
6. **Content drop** = Ink + scene manifest + assets — not shell rewrite.

## Module map (where to change what)

| If you need to…             | Edit                                                               |
| --------------------------- | ------------------------------------------------------------------ |
| Add a meta screen           | `views/<Screen>.tsx` + route in `App.tsx`                          |
| Play HUD / system menu      | `views/play/PlayHud.tsx`, `SystemMenu.tsx`                         |
| Dialogue + AI choice UI     | `views/play/DialoguePanel.tsx`                                     |
| Host/guest choice + RPS     | `views/play/usePlayChoiceFlow.ts`                                  |
| Cutscene / BGM / SFX timing | `views/play/useStageMedia.ts`                                      |
| Shared cursor / touch focus | `coplay/pointerPolicy.ts` + `useCoPlayPointers.ts`                 |
| Save schema                 | `persistence/gameSave.ts` + `saveWriter.ts` + tests                |
| Settings values             | `persistence/settings.ts` + `views/settings/*` (player vs lab)     |
| Local cinema CSS            | `styles/{base,stage,meta,coplay,chrome}.css` (barrel `styles.css`) |
| Co-play RPS presentation    | `coplay/rpsViewModel.ts`                                           |
| Audio play/pan/reverb       | `audio/gameAudio.ts` + `howlerEngine.ts`                           |
| Battery pitch copy          | `commerce/aiBatteryPitch.ts`                                       |
| AI edge HTTP                | `services/ai-branch/src/routeTable.ts` (not `server.ts`)           |
| Wallet reserve/commit       | `services/ai-branch/src/walletMeter.ts`                            |
| TTS fixed phrases           | `services/ai-branch/src/ttsCatalog.ts`                             |
| Story content               | **`packages/content`**                                             |

## AI edge map (`services/ai-branch`)

| File                             | Role                               |
| -------------------------------- | ---------------------------------- |
| `server.ts`                      | secrets + listen only              |
| `routeTable.ts`                  | all HTTP endpoints                 |
| `walletMeter.ts`                 | service_role reserve/commit/refund |
| `ttsCatalog.ts`                  | trusted preview phrases            |
| `authGate.ts`                    | JWT verify (publishable key)       |
| `handler.ts` / `mastraBranch.ts` | constrained AI generation          |

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

Last reviewed: 2026-07-10
