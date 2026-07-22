# Media Attribution (draft chapters)

Exact runtime paths, byte sizes, and SHA-256 fingerprints live in
[`RUNTIME-ASSET-LEDGER.csv`](./RUNTIME-ASSET-LEDGER.csv). A file is not a
commercial-release asset merely because it is present in the demo: the ledger's
`release_status` column is the release gate.

The machine-readable visual intake lives in
[`VISUAL-ASSET-INTAKE.json`](./VISUAL-ASSET-INTAKE.json). It adds stable IDs,
chapter/use references, delivery contracts, dimensions, decoded MIME,
transparency rules, provenance, file status, quality status, rights status,
structured rights-review records, and explicit missing-asset records.
`RUNTIME-ASSET-LEDGER.csv` remains
the fingerprint ledger for every runtime media file, including audio; the visual
intake does not replace it.

Status fields are independent. `fileStatus=present` means only that the exact
bytes exist. It does not imply `qualityStatus=production_ready` or
`rightsStatus=cleared`. Production necessity is independently derived from scene
manifests, the current-character registry/frozen ID contract, archive record IDs,
the formal Su Ming portrait allowlist, the boot runtime source, and the runtime
ledger. The intake's `requiredForProduction` field is only a readable mirror and
cannot turn those requirements off. Production audit mode blocks until every
truth-required visual satisfies all three gates and every formal production gap
is resolved.

## Rights review contract

The per-asset `source` object records provenance; a path, prompt note, attribution
section, public HTTPS policy URL, or arbitrary non-empty string is not rights
clearance. A cleared asset must have a structured `rightsEvidence` record with:

- evidence `kind` and identified `ownerOrLicensor` / `reviewer` (substantive text;
  placeholders and filler such as all-x are rejected);
- `reference` to an existing non-symlink regular file under
  `packages/content/assets/rights-evidence/`;
- lowercase `sha256` matching those exact bytes;
- `reviewedAt` as a real UTC `YYYY-MM-DD` not later than the audit day.

HTTPS URL shape is provenance only and cannot clear `rightsStatus`. Local
references are realpath-checked against this attribution file, the intake,
README, the audit implementation, and its tests; symlinks are rejected.

The current intake deliberately contains empty `rightsEvidence` and
`gapResolutions` arrays. No commercial receipt, generation-session record,
license, assignment, likeness release, or formal gap closeout has been supplied
and reviewed for these visual files. Existing assets therefore remain `pending`
and formal gaps remain production blockers; this migration does not invent or
infer clearance. Machine acceptance of structured evidence is not legal
authenticity — human review remains required.

## Generated in-house (AI image tools)

- Scene backgrounds: `apps/web/public/assets/scenes/*.jpg`
- Character portraits: `apps/web/public/assets/portraits/suming-*.png`
- Boot splash still: `apps/web/public/assets/ui/boot-splash.jpg` (click-to-start gate)

These are project-owned generation outputs for SupaLuv prototype use.

The four current scene backgrounds and the boot splash are recorded as
`prototype_only` with release-rights evidence pending. They keep the two
noncanonical draft chapters playable, but they do not close the formal
background shot list or release-rights review.

### Recorded 2026-07-11 mood repairs

`suming-committed` and `suming-restless` were regenerated because their previous
files duplicated `suming-lonely` and `suming-shame`. The final prompts,
invariants, processing steps and source references are recorded in
`packages/content/characters/suming/prompts.md`. This repairs provenance for
those two outputs only; it does not retroactively clear the older generated
image set.

The external policy links below are attribution notes, not reviewed evidence for
an individual asset. Keep the two repaired assets at
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
- Voice is generated at runtime through the dual-provider route documented in
  `docs/reference/architecture/dual-tts-routing.md`; it is not stored in this
  authored-bed asset table.
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

## Recorded visual production gaps

No binary is fabricated for these entries. Each missing item has a stable ID,
an expected delivery contract, an independently enforced production requirement,
and a note about
the current draft fallback in `VISUAL-ASSET-INTAKE.json`.

### Named character portraits and references

| Character / role                       | Required portrait ID       | Required reference ID   | Runtime key (2026-07-17)      |
| -------------------------------------- | -------------------------- | ----------------------- | ----------------------------- |
| 陈佳                                   | `chenjia-neutral`          | `chen-jia-ref-base`     | `chenjia-neutral.png`         |
| 雷欧                                   | `leo-neutral`              | `leo-ref-base`          | `leo-neutral.png` (+ annoyed) |
| 石佩欣                                 | `zhou-neutral`             | `shi-peixin-ref-base`   | `zhou-neutral.png` (stable)   |
| 工作人员                               | `staff-neutral`            | `staff-worker-ref-base` | `staff-neutral.png`           |
| 小组长                                 | `stafflead-neutral`        | `staff-lead-ref-base`   | `stafflead-neutral.png`       |
| 老板娘                                 | `shopowner-neutral`        | `shop-owner-ref-base`   | `shopowner-neutral.png`       |
| 朱珠 / 黄老太 / 警察 / 网格员 / 快递员 | matching `*-neutral` stems | npc green refs          | ADR-0006 NPC CG batch         |

NPC CG portraits landed 2026-07-17 (ADR-0006 green matte). `lin-neutral` remains
legacy-only for archive speaker 林晓棠. Additional NPC mood matrix beyond
`leo-annoyed` is still open.

### Prop and interface stills

| Stable asset ID        | Draft use                              | Current fallback               |
| ---------------------- | -------------------------------------- | ------------------------------ |
| `prop-protocol-terms`  | Chapter 1 protocol archive/interaction | Accessible authored text + CSS |
| `prop-barcode-shift`   | Chapter 2 barcode archive/interaction  | Accessible authored text + CSS |
| `prop-rental-receipt`  | Chapter 2 rental-receipt archive       | Accessible gallery text record |
| `prop-application-nda` | Chapter 2 NDA/mobile questionnaire     | Accessible authored text + CSS |
| `prop-approval-sms`    | Chapter 2 approval-message archive     | Accessible gallery text record |

These gaps do not block the current technical mainline: the authored Ink path,
scene manifests, text/CSS interactions, and accessible gallery copy already
carry the story. They do block a formal visual-production release gate.

## Unresolved production evidence

- The three-chapter production background shot list is not yet frozen; the four
  coarse draft backgrounds must not be mistaken for a complete shot package.
- A per-character NPC mood matrix is not yet approved; only the minimum neutral
  IDs are reserved.
- Existing owner-generated image files still need the applicable generation
  account/session evidence and any relevant adult-likeness permissions recorded
  before `rightsStatus` can become `cleared`.

This intake pass did not call image or cloud services and did not inspect secret
or account files. The external policy links above are prior attribution notes,
not newly captured release receipts.
