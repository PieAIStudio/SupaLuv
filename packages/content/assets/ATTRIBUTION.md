# Media Attribution (Chapter 01 demo)

Exact runtime paths, byte sizes, and SHA-256 fingerprints live in
[`RUNTIME-ASSET-LEDGER.csv`](./RUNTIME-ASSET-LEDGER.csv). A file is not a
commercial-release asset merely because it is present in the demo: the ledger's
`release_status` column is the release gate.

## Generated in-house (AI image tools)

- Scene backgrounds: `apps/web/public/assets/scenes/*.jpg`
- Character portraits: `apps/web/public/assets/portraits/suming-*.png`
- Boot splash still: `apps/web/public/assets/ui/boot-splash.jpg` (click-to-start gate)

These are project-owned generation outputs for SupaLuv prototype use.

### Recorded 2026-07-11 mood repairs

`suming-committed` and `suming-restless` were regenerated because their previous
files duplicated `suming-lonely` and `suming-shame`. The final prompts,
invariants, processing steps and source references are recorded in
`packages/content/characters/suming/prompts.md`. This repairs provenance for
those two outputs only; it does not retroactively clear the older generated
image set.

Current OpenAI service terms say customers own output to the extent permitted by
law, while visual-capability users remain responsible for having necessary
input and likeness rights. Keep the two repaired assets at
`terms_review_pending` until the product's release-rights review records the
applicable account agreement and confirms the fictional-character input chain:

- <https://openai.com/policies/service-terms/>
- <https://cdn.openai.com/osa/openai-services-agreement.pdf>

## AI music beds (Lyria 3 via Gemini, 2026-07)

Owner-generated instrumental beds. Runtime IDs are stable; original export
titles are recorded for provenance only.

| Runtime ID (`/assets/audio/bgm/`) | Channel | Role                     | Source export title       |
| --------------------------------- | ------- | ------------------------ | ------------------------- |
| `title-theme.mp3`                 | music   | Title / menu             | Ten_Past_Midnight         |
| `soft-piano.mp3`                  | music   | In-play dialogue score   | Before_the_Last_Train     |
| `chapter-end.mp3`                 | music   | Chapter end / aftertaste | The_Last_Train_to_Shibuya |
| `night-ambient.mp3`               | ambient | Office / public space    | Behind_The_Glass          |
| `lonely-pad.mp3`                  | ambient | Apartment / private      | Half_Empty_Teacups        |

Notes:

- Prefer **instrumental** beds so dialogue stays readable.
- `soft-piano` keeps a legacy ID so existing scene `bgmKey`s keep working after
  the Mixkit prototype beds were replaced.
- Voice channel is reserved (no VO files yet). TTS vendor research:
  `docs/reference/research/ai-voice-tts-vendor-selection-v1.md`.
- Google states that it does not claim ownership of original output from
  labs.google/fx and documents downloading Lyria tracks, but the local files do
  not retain generation-session receipts. Their commercial evidence therefore
  remains pending rather than inferred from the general terms:
  <https://labs.google/fx/en-gb/faq> and
  <https://support.google.com/gemini/answer/16901237>.

## Third-party free SFX (Mixkit License)

Mixkit's current Sound Effects Free License permits commercial and personal
project use without required attribution:

- License index: <https://mixkit.co/license/>
- Sound effects catalog / FAQ: <https://mixkit.co/free-sound-effects/>

The four local files were downloaded as Mixkit previews, but their exact item
pages were not recorded. They remain demo-approved and must be replaced or
matched to exact item URLs plus a license snapshot before a paid build.

| File                          | Role           | Source family      |
| ----------------------------- | -------------- | ------------------ |
| `audio/sfx/ui-click.mp3`      | UI click       | Mixkit SFX preview |
| `audio/sfx/ui-choice.mp3`     | Choice confirm | Mixkit SFX preview |
| `audio/sfx/notify-soft.mp3`   | Soft notify    | Mixkit SFX preview |
| `audio/sfx/payment-chime.mp3` | Payment beat   | Mixkit SFX preview |

If a Mixkit URL is later unavailable, replace the file in place and update both
this table and the runtime ledger hash.
