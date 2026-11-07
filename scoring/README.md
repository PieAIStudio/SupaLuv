# The look score and the code score

A click test can pass while labels cover buttons. These two scores check what
people see and how hard the next code change will be. They are part of PGS
Engineering Review, not another workflow or CI service.

## Start with one small app file

Copy `scoring/settings.example.json` to **`scoring.json` in the app root**.
Edit its pages, stable ready selectors, approved reference pictures and code
commands. Paths in this file are relative to the app root, not to this guide.
`settings.schema.json` is the format. Pass marks may be raised, not lowered:
both scores aim for **8.5/10**, no item below **7**; a mean code score below
**7** starts a refactor. A below-target code score is advice, not a release block.
References stay in the app. PGS does not approve pictures for it.

The first implementation supports JavaScript/TypeScript code. It uses Playwright,
axe-core, ESLint with typescript-eslint, jscpd, dependency-cruiser and lcov-parse.
Use the project's existing checks and test coverage producer, not another copy.
A fresh tool installation may need `pnpm exec playwright install chromium`.
Do not install it on every run. No browser or OS settings are changed.

## Every push: machine checks

Start the app's isolated local build using its usual command. Pick the complete
outgoing base, not just the last commit. For example, before pushing to main:

```sh
BASE=$(git merge-base HEAD origin/main)
pnpm pro-gov lens score look --url http://127.0.0.1:4173 \
  --out .reports/2026-11-01-scores/look-1
pnpm pro-gov lens score code --base "$BASE" \
  --out .reports/2026-11-01-scores/code-1
```

Use a new output directory each time. A failed/partial first run is evidence,
not a file to overwrite. On a busy machine use the host's approved heavy-job
queue. Ordinary push must not start hosted Actions or a deployment.

### Look layer 1

At **1920×1080** and **390×844**, the tool saves separate viewport and full-page
PNGs and a short `look.json`. Playwright measures DOM rectangles for overlap,
cut-off text and sideways scroll. Axe checks colour contrast and WCAG 2.2
**target-size** (24 CSS px, including its spacing and inline-text exceptions).
This is a minimum hit-area check, not a claim that a 24 px phone button is a good
design. The independent look score also judges comfort and readability.

The small DOM adapter compares visible text/control boxes, not background
containers or parent/child boxes. It respects closed menus and scroll/clip
bounds: a hidden rectangle is not a painted overlap. It cannot judge painted glyphs, canvas/WebGL,
shadow roots, animation quality or all inner-scroller states. Keep native
project layout tests for those, including map-label tests. Below-fold content
in an inner scroller needs its own page/state. A measured overlap is a candidate
to inspect in the original screenshot, not an automatic diagnosis of its cause.
Axe's `incomplete` results need inspection; they are never silently passed.

Pages must provide a real visible `ready` selector. Use the app's actual ready
state, not `#root > *`, a loading wrapper or a test-injected flag. The tool waits
for that selector and fonts, not a fixed sleep. It does not click through login, write data, use real
accounts or call hidden APIs. Non-read HTTP requests are blocked and listed as
evidence gaps. It runs in fresh browser contexts against loopback URLs only.

For an app's existing isolated fixture/navigation helper, set
`look.prepareModule` to a project-owned `.mjs` module exporting
`async prepare(page, pageId)`. It runs after navigation, before readiness. It is
trusted project code, **not a sandbox**: keep it in the test fixture, never use
it to bypass production login or manufacture real progress.

Intentional overlays/truncation may use `look.ignore`, each with a selector and
a concrete reason. They are listed in the report and excluded from both DOM and
axe checks. Do not add exclusions just to turn a real failure green.

A small page set aims for about one minute. `durationMs` reports the real cost;
a large page list, readiness failures or a busy host can take longer. Trim the
push set through the project's existing source-to-screen mapping, not by hiding
failed screens. Keep the larger release set in the same app-owned settings.

### Code layer 1

Only files matching `code.include`, minus `code.exclude`, in the diff from
`--base` are measured. Staged, unstaged and new source files are included and
hashed. A bad base is an error, not an empty clean report. Deletions add no new
lines; renames and changed modules still need the project's normal checks.

`code.json` contains:

- Native type/lint results. Both must report **0 errors**. A failed command keeps
  its nonzero status; PGS never guesses an error count from arbitrary text.
  `{files}` expands to changed paths, without a shell. A type check may need the
  importing project's full type closure. Commands time out after 60 seconds;
  a slower project should supply its existing fast related-check adapter.
- Long files (default 500 lines) and complex functions (default complexity 15).
  These are advice, not reasons to split a file blindly.
- jscpd clone counts/lines among the changed files. Clone partners outside that
  selection are a declared blind spot. Its raw native JSON is retained too.
- dependency-cruiser violations for direct imports from changed modules.
  Configure the real boundary rules. An empty list means **not configured**,
  not “no broken rules”. Unresolved imports are incomplete, not a pass.
- Tests covering changed **executable** lines from existing LCOV output.
  Missing coverage is unknown, not 0%, 100% or a pass. After tests, the existing
  runner should write `<lcov-path>.inputs.json` as
  `{"files":{"src/example.ts":"<current SHA-256>"}}`. A missing/mismatched
  source hash marks the numbers incomplete. The project gate still owns proof
  that test code, fixtures, dependencies and config are current.

Example boundary for a standalone Kit that may not import another Kit:

```json
{ "name": "no-kit-to-kit", "from": "^src/", "to": "(^|/)@pieai/swimmer-[^/]+-kit(/|$)" }
```

Rules match resolved module paths. Use the owning project's actual package
names and aliases; a generic example is not proof that its boundary is covered.
`null` type/lint commands mean **not configured**. They are useful in a read-only
dry run but cannot produce a clean push receipt.

Exit codes: **0** measured/accepted, **1** failed native checks or look findings,
**2** missing/invalid evidence. Long files, clones, complexity and a low AI code
score do not themselves make an exit-1 release gate. Existing project checks
still decide ordinary push. Release is blocked only by the project's red lines
(data, money, login, security or an unusable site/whole lesson); retain all other
failures and gaps for the conductor. No score grants release permission.

## When a screen changes, and before release: AI look score

Use **design-before-build** for design decisions, **playwright-cli** / project
Playwright for browser evidence, **ai-visual-scoring-loop** for independent media
review, and **use-ai-workers** to choose a permitted different AI/model. Read
these skills where they are actually installed; a registry entry is not proof
of availability. Do not create another copy of their methods.

Give the scorer the approved reference pictures and follow
**ai-visual-scoring-loop → Evidence rules**. Static screens/assets need only
original full-size screenshots as **separate files**, never merged sheets.
Moving screens/assets (animation, motion, video or sound) also need original
**MP4, H.264 + AAC, at least 2560 px wide**. Keep actual page sound; a verified
silent page may have a silent AAC track, labelled **page silent**. A recorder
that missed sound is not proof of silence. Do not upscale.

Use a native capture scale large enough for each viewport (for example desktop
DPR 2 gives 3840×2160; phone DPR 7 gives 2730×5908). Inspect a full-size frame
for readable body text. Record the machine report SHA-256 and the person/agent
who checked that the high-resolution media shows the **same candidate/state**.
The media checker validates dimensions/codecs, not the truth of that statement.
It does not record sound or turn a silent WebM into proof of captured audio.

Create a media manifest (one screen entry per page/viewport). For a static
screen set `motion: false` and omit `video`, `audio`, `audioVerifiedBy`; native
screenshot scale 1 is valid. For moving screens set `motion: true` and keep
these fields. Omitting `motion` preserves the legacy recording requirement:

```json
{
  "version": 1,
  "machineHash": "<SHA-256 of look.json>",
  "sameCandidateVerifiedBy": "<who checked candidate and state>",
  "screens": [
    {
      "area": "home-desktop",
      "screenshot": "home-desktop.png",
      "video": "home-desktop.mp4",
      "captureScale": 2,
      "audio": "page-silent",
      "audioVerifiedBy": "<who verified silence or actual captured sound>",
      "readabilityCheckedBy": "<who inspected a full-size frame>",
      "separateOriginal": true
    }
  ]
}
```

```sh
pnpm pro-gov lens score evidence --manifest /path/to/media.json \
  --machine .reports/2026-11-01-scores/look-1/look.json \
  --out .reports/2026-11-01-scores/evidence-1
```

This saves native `ffprobe` JSON for **each** MP4 and hashes all supplied files.
Missing media, unreadable frames, missing reference pictures or a scorer unable
to read the required files **block handoff**. Never replace them with a sheet.
Send the video first, then separate original screenshots and reference pictures.
Keep the reviewer's original response and its actual file-read receipt.

Ask for five 0–10 items **per screen**: `style` (matches our approved look),
`firstAction` (clear what to do first), `smallScreen` (readable when small),
`craft` (finely made), `uikit` (consistent with UIKit). Each screen needs a mean
of at least **8.5**, and all items at least **7**. Do not average away a bad screen.
The owner sees only what has passed machine and AI checks.

**Build → check → score → fix, at most three rounds.** After round three still
fails, stop and explain the remaining problems. Do not silently reset the run,
reuse old screenshots or let the builder score its own work. A failed look score
is not quietly shipped as a pass; the conductor records any release red-line
decision separately.

## Weekly per repo, and before release: AI code score

A different AI/model reads the changed modules, their native numbers and the
necessary contracts/import context. It scores `names`, `boundaries`,
`changeability`, `tests` and `reuse`, each 0–10, in one `changed-modules` area,
then gives a short fix list. This is a design review, not an error-count formula.
Use the full weekly/release change range. Both scores report the approved
**8.5/10, no item below 7** quality target (or the app's higher marks).
Use the same **build → check → score → fix loop, at most three rounds** for
code too. Below the bar, fix and rescore in the same run; a mean code score
below 7 starts the refactor skill. If round three still misses the bar, stop
and explain the remaining fixes. A low code score does not add a release gate.
Missing code or context is a gap, not permission to invent a score.

Both AI replies use `review.schema.json`: `version:1`, `kind:"look"|"code"`, a
stable `runId`, `round`, `machineHash`, different `builder`/`reviewer` identities
(`id` and actual `model`), `seen` files (`path`, `sha256`), `scores`
(`area`, the five `items`, `reason`) and `fixList`. Paths in `seen` are relative
to the AI JSON file or absolute. Require the real model to report what it read;
the importer cannot prove an AI really watched a video from a checkbox.

```sh
pnpm pro-gov lens score review --machine /path/to/code.json \
  --review /path/to/independent-ai.json --out .reports/2026-11-01-scores/code-review-1
# For look, also pass --evidence /path/to/evidence.json.
# Round 2/3 also needs --previous /path/to/previous/score.json.
```

`score.json` keeps `schemaVersion: 1` and uses these review statuses:

- `passed`: the AI score meets the app's quality bar.
- `fix-and-rescore`: below the bar in round 1 or 2; fix, then use `--previous`.
- `refactor-required`: code is below the refactor mark in round 1 or 2. Keep
  this status for existing readers; use the refactor handoff, then `--previous`.
- `stopped`: still below the bar in round 3. Stop the loop, even if a refactor
  is required. The refactor flag and request remain, not permission for round 4.
- `machine-not-passed`: a look score meets the AI bar but its machine check
  does not; fix it before continuing. Round 3 stops instead.

Older code reports with `status: "reviewed"` remain valid as `--previous` when
`meetsQualityBar` is `false` and fewer than three rounds were used. Already
passed reports cannot continue. No old report needs rewriting. A code review
returns exit **0** even below the bar or stopped, with
`releaseBlockedByScore: false`; invalid/missing evidence still returns **2**. Look failures still return
**1**. Code machine failures keep their own exit codes and `machineStatus`;
a `passed` AI score does not clear a failed native check.

`seen` must include the machine report itself and every required source/media
file and reference picture. The tool rejects self-scoring, missing reads,
changed bytes, missing areas and skipped rounds. A mean code score **under 7** writes `refactor-request.json`.
The executing agent starts **ai-architecture-scoring-loop**, bounded refactor route, from that
handoff, with the skill's baseline/verification method and **no behaviour change**.
Do not copy that skill into this guide. In a read-only pilot, return the request
for an authorized writer instead of changing the app. Low code scores never
block release on their own. The owner keeps the final say.
