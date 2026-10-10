# Handover: cloud session to local GPU session (10 October 2026)

The cloud session that worked A70–A77 hands over to a session on Ael's PC (RTX 3080). This note is the starting point:
the goal, the rules, every backlog item's state, what was in progress and the exact next steps.

## Goal

Bring Tervain to an honest 10/10: Gothic 3's grounded, muted look up close, figures that move and touch the world
believably, and frames that are light without any visible loss. "Honest" means each claim is shown in the served build
(before/after screenshots) and measured where it can be; nothing is reported done that has not been seen working.

## Working rules

- **Branch.** Work only on `claude/determined-archimedes-m2rekb`. After each PR merges, restart that branch from the
  latest `main` (`git fetch origin main && git checkout -B claude/determined-archimedes-m2rekb origin/main`, then
  push with `--force-with-lease`); never stack new work on merged history.
- **Commits.** Clear messages; end each with the session's attribution lines. No model names in repository content.
- **PRs.** Open a PR for each round, wait for CI to be green, merge it (pass the real head SHA from
  `git rev-parse HEAD` as the expected head), then restart the branch. Fix any PR description that goes stale (as
  #216's 11.6 M figure was).
- **Verification.** Every visible change is checked in the served production build (`npx vite build`, then
  `npx vite preview`), with before/after screenshots at the range it matters (close range for materials, the same
  view and hour for both). Numbers come from the benchmark or a per-frame count, never from estimates.
- **Reporting.** Report item by item: what changed, the evidence, and what remains open or was tried and not kept.
- **Records.** Each round gets an engineering record (`docs/engineering/a7N-*.md`) and a row in `docs/decisions.md`.
- **Standard.** Do not stop until it is honestly 10/10 with nothing left that can be done. Hard limits are recorded
  as hard limits, with the reason, not dropped.

## Budgets

- Triangles: tree 20 k, resident (NPC) 50 k, hero 150 k.
- Meshy credits (caps): trees and fingers 30 of 100 used; hero 35 of 200 used. Nothing was spent in A75–A77 (no API
  key in the cloud container). Do not spend beyond the caps.

## Ael's decisions in force

- **Asset ledger (A72, A73, A75).** Each Meshy source carries its own provenance. On Ael's answer (A75), 52 of the 54
  supplied sources are classified as Meshy Community downloads under CC0 1.0 (creator and listing not recorded,
  "owner recollection, not individually verified"); project-generated sources are Meshy Pro paid-plan output. No
  commercial clearance is asserted. See `docs/engineering/model-licenses.md`.
- **High's trees (0.0.10, A62).** High draws the full tree model at every distance by default. A76 added an opt-in,
  Settings → "Lighter distant trees" (`?treelod=1`, `tools/bench.mjs --treelod`), giving High Medium's distance bands;
  with it off, High is unchanged. A77 was allowed to change High's default if it saved cost with no visible loss: giving
  High its own bands cost 3–6% *more* triangles (crossfade double draws), so the default stays.
- **Optimise with no visible loss (A77).** Make the game noticeably less demanding (triangles, draw calls, shadows,
  textures, distant detail, culling) with no popping, holes, stretched or broken geometry or loss up close. Measure
  before and after with the benchmark; check visually in the served build.
- **Cloud first, then GPU.** Real-GPU benchmarks were never a blocker in the cloud; they were prepared to run on the
  RTX 3080 (commands below). That is now the first thing to do locally.

## Backlog status

| # | Item | State |
| --- | --- | --- |
| 1 | Indoor light and sound respect floor and ceiling | Done (A70); re-verified A75. |
| 2 | Bounded recovery for failed building textures | Done (A70). |
| 3 | Controller hints on right-stick look | Done (A70). |
| 4 | Smaller first download, staged loading | Done to 57.7 MiB before entry (A72, A75). **Open:** staged loading of the near tree files (below). |
| 5 | Fixed-step simulation, interpolated drawing | Done (A72). |
| 6 | Animation: transitions, contact, turns, feet, fingers | Done: phases and overlays (A70–A72), turns led by head and chest (A76), feet planted on uneven ground (A70), finger joints seated and the quill in the writing hand (A75). **Open:** authored turn clips. **Hard limit:** three modelled-fist hands (fingers not separable without new source models; Meshy caps apply). |
| 7 | Residents inhabit interiors | Done (A70). |
| 8 | Hunting, respawn, encounters, progression, riding | Done (A70, A71, A75). |
| 9 | Close-up quality (Gothic 3) | Done in A76: plaster, timber, stone, iron, cloth, ground, colour grade, room and village clutter; crown leaf masses; wall hairline. **Hard limit:** a shadow-casting hearth light exceeds the richest materials' texture units. Tasks still open in the tracker: soft layered crown silhouettes with no hard alpha cut-outs (partly A72, A76; new crown exports would finish it). |
| 10 | Performance evidence | Container (software rendering) numbers in A76 and A77. **Open:** real-GPU frame and GPU times (commands below); A75's GPU geometry count still rising 2–3 a stop on a third lap, not yet shown to level off. |
| 11 | Asset ledger | Done as far as the owner's answers go (CC0 classification above); 2 sources remain unresolved. |
| 12 | Hero rework polish | Done (A73, A75). |
| 13 | Frame cost (A77) | **In progress**, see below. |

## In progress now: A77, lighter frames

All committed and pushed on `claude/determined-archimedes-m2rekb` (not yet merged when this note was written; the
handover PR carries it): `e1934402` lighter reflection and shadows, `df340bbd` window view, the decision row, and this
note. What it does (details and numbers in `docs/engineering/a77-optimisation.md`):

- Water reflection leaves out grass and forest-floor plants and draws the full-detail trees with their middle models
  (`waterRenderPass.ts` `unreflected`/`lighten`; `flora.ts` `lighterForReflection`). Views across the pond −16%
  triangles; screenshots differ by a mean of 0.35 of 255.
- Tree shadows switch to the middle model at 16 m (was 25 m): same outline.
- Window view (indoors): the cube capture draws middle-model trees, and after a room's first capture each refresh
  draws one face a frame instead of six at once (`windowView.ts`, unit test `tests/presentation/windowView.test.ts`).
- Route (High, `--quick`): median 4.01 M → 3.88 M triangles, 418 → 397 draw calls; the shore segment 10.78 M → 7.94 M.

**Exact next steps:**

1. Measure the window view in the served build (per-frame triangles in house_a over 420 frames, median, p99, max,
   frames over 5 M; screenshots of the windows before/after). The cloud run did not finish before the handover. In the
   A77 record the window row's visual-check cell points here; replace it with the figures and the screenshot
   comparison. On a GPU this takes seconds: build `e1934402` (before) and the branch head
   (after), stand in house_a looking at the back windows, and count `renderer.info.render.triangles` per frame
   (reset `renderer.info` each frame; `?shot=1` exposes `window.tervain`).
2. Run the real-GPU benchmarks (below) on main and fill A76/A77's GPU columns.
3. With GPU timings in hand, weigh the remaining GPU-side costs: shadow-map fill, leaf-card overdraw,
   post-processing, and whether a 3072 shadow map on High is visibly softer (A77 "tried and not kept").
4. Staged loading of the near tree files (backlog 4), below.

## Staged loading: what it needs

The near tree files are 27 MiB of the 57.7 MiB fetched before entry. They cannot simply load later:
`meshyTrees.ts` derives each tree's scale and bounds from the near model (`source[0].scene`), `flora.ts` uses
`lods[0]` for collisions, crown shapes (`crownOf`) and the triangle count, `fallingLeaves.ts` and
`sampleLeafSurfaceSites` use the near leaves, and the mid and far files borrow the near file's images (A71). Doing it
needs: the mid files exported with their own smaller images (`tools/optimise-models.mjs --share` is what stripped
them), a small manifest of each tree's scale, bounds, trunk/crown radius and leaf sites, and the world opening on
middle models with near models swapped in as they arrive. Note the trees are already prefetched while the menu is open
(`journeyPrefetch.ts`), and on High the near model is drawn at every distance, so a late swap would be visible there:
High would have to wait for the near files, or the swap be confined to trees out of the near band.

## Known issues and dead ends

- SwiftShader (cloud) frame and CPU times say nothing about a GPU; only draw calls and triangles carry over.
- The JS CPU profile under SwiftShader is dominated by GL calls: not usable without a GPU.
- `renderer.info.autoReset` is false; `PerfMeter.begin()` resets it per frame. A manual frame driver must call
  `renderer.info.reset()` itself, or counts accumulate (that was the 11.6 M mistake, corrected in #216).
- The benchmark used to measure the pause menu; fixed in A76 (samples skipped while the menu background is shown).
- Long `page.eval` calls in `tools/cdp.mjs` time out and return `undefined`: step frames in chunks of 30.
- Tried and not kept (A77): High distance bands (+3–6% triangles); drawing the sun's shadow map every other frame
  (feet trail their shadow); thinner grass (A75 density is the owner's fix); a smaller shadow map without GPU
  evidence.
- A75: GPU geometry count rising slowly on a third lap, not yet shown to be a leak.

## Benchmark commands for the RTX 3080

In a first terminal, from the repository:

```
git pull
npm ci
npx vite build
npx vite preview --port 4173
```

In a second terminal:

```
node tools/bench.mjs --headed --quality high --runs 3 --out bench-high.json
node tools/bench.mjs --headed --quality high --treelod --runs 3 --out bench-high-treelod.json
node tools/bench.mjs --headed --quality medium --runs 3 --out bench-medium.json
node tools/bench.mjs --headed --quality low --runs 3 --out bench-low.json
```

`--headed` is required (headless Chromium renders in software). If Chrome or Edge is not found, set `CHROME` to its
path (PowerShell: `$env:CHROME = "C:\Program Files\Google\Chrome\Application\chrome.exe"`). Keep the window in front,
on mains power. The first lap includes shader compiles; laps two and three are the figures. `--quick` runs one short
lap. In game: Settings → Show FPS (or `?fps=1`) shows frame, CPU and GPU time, draw calls and triangles; F3 →
*Run benchmark route*. A 60 Hz display caps frame time at 16.7 ms, so read the CPU and GPU columns.

For an A77 before/after on the GPU, build `35b825c0` (before, main after #217) and the A77 head into separate folders
and run the same commands against each.

## Latest merged PR and unpushed work

- Latest merged: [ael-dev3/tervain#217](https://github.com/ael-dev3/tervain/pull/217) (A76 close-up polish, High tree
  opt-in, benchmark fix), merge commit `35b825c0`.
- Unmerged at the time of writing: A77 (three commits on `claude/determined-archimedes-m2rekb`) and this note, merged
  together by the handover PR.
- Nothing is left uncommitted or unpushed. Container-only scratch (driver scripts in `/tmp/claude-0/drv`, served
  builds, screenshots) is not in the repository and is not needed: the scripts' method is described above.
