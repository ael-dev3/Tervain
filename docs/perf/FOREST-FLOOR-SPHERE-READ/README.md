# Read immutable forest-floor bounds directly

Candidate `6619fce8be91e8ea1ecf0fa7c78446f5b9ae6062`, published base `0536353b9a7aa15d2a6687da1b3687d6008aa9c3` (0.0.38). `forestFloor.update` copies each distance-retained placement sphere into a scratch sphere, then only reads it in camera/shadow frustum tests. Read the immutable placement sphere directly and remove the unused scratch sphere. No thresholds, geometry, matrices, materials, shaders, distance fades, texture taps or upload policy change. This removes copying, **not per-frame allocations** (the old scratch was allocated once at construction).

## Published-build reproduction

The [live probe](live-work.json) on published `0536353` performs twelve controlled fixed-eye turns of the native High forest module at (-80,12). It counts calls/stacks, not CPU time. **8,160 sphere copies** originate at the exact floor call site (680/update); the other **212** copies come from tree/batch bounds and are not removed. The published bundle at that stack position contains `I.copy(e.bounds[a])` immediately before `re.intersectsSphere(I)` and the shadow test. The native floor has **698 pieces**. Shadows are omitted in this controlled attribution probe; the separate regression and native render proof cover shadow selection. It is not a normal third-person orbit, walking frame-time trace or GPU measurement.

`node tools/repro-live-floor-sphere-work.mjs [output-file]` with Chrome configured reproduces the read-only live counter. Its prototype/stack instrumentation changes probe CPU cost; no timing is inferred from it. A position-based fade cache was not implemented: normal camera orbits change camera x/z, so it would not avoid that work consistently.

## Regression and semantic pairing

`npx vitest run tests/presentation/forestFloorBounds.test.ts tests/presentation/forestFloor.test.ts tests/presentation/forestFloorMatrices.test.ts tests/presentation/forestFloorPending.test.ts`: **17 tests pass**, build passes. The new regression fails on original code (**10,118 copy calls**) and passes after (**0**) across mixed moving view and shadow selections. A separate delivered-terrain **874-piece** fixture compares all packed instance, colour and coverage output at **90 walking/turning states**, exactly equal. The fixture population differs from the native planted-crown context; do not label its timing as the 698-piece live scene.

## Helper CPU, small absolute saving

Three fresh test processes. Each warms both implementations through 90 paired states, then rotates original/candidate/unchanged-original through 45 blocks/mode, 240 updates/block, giving **135 block averages per mode**. Camera positioning is outside timing. [Raw sets](cpu-set-0.json) retain the controls. The p95 is a percentile of **block averages**, not individual frame p95.

| Mode | Mean ms/update | p95 block-average ms/update |
| --- | ---: | ---: |
| before | 0.022281 | 0.024636 |
| after | 0.018721 | 0.020625 |
| control | 0.020807 | 0.023015 |

Only about **2–4 microseconds per helper update** are saved relative to the original/control. These are Node/V8 helper timings, not full-frame CPU, software GPU time, Apple hardware, heat or steady-60fps measurements. This does not establish or fix the historical live16 ~33 ms walk-fence/run-round cause.

Reproduce with `node tools/repro-floor-sphere-cpu.mjs [output-directory]` from the candidate checkout with dependencies; the driver creates and removes its private test and baseline module and refuses to overwrite an existing test. Fetch pinned `0536353b9` when shallow.

## Native same-mesh rendering

High 640×360 DPR1, frozen time/wind, post/MSAA and auxiliary passes. Complete original/candidate floor modules receive the same actual native frame inputs. Their packed buffers, visibility and counts match at every checked update (204 checks in this run). Each mode applies its output to the **same registered native meshes**; the comparison module's separate group is never added to the scene. Thus the proof does not introduce extra objects/materials into auxiliary-pass ownership. Both algorithms run only in the proof harness, so these captures carry no native timing claim.

Twenty PNGs at five fixed poses (two repeats/mode) are independently RGB-identical. The legacy run-round pose now looks indoors; these are fixed views rather than a real walking clip. The base world and arrival state are held fixed, not a complete resident-animation audit.

| Pose | Original / candidate draws | Original / candidate triangles | Changed RGB pixels |
| --- | ---: | ---: | ---: |
| fence | 644 / 644 | 7,170,911 / 7,170,911 | 0 |
| run-round | 239 / 239 | 2,245,715 / 2,245,715 | 0 |
| bow | 707 / 707 | 7,936,955 / 7,936,955 | 0 |
| birch | 436 / 436 | 5,641,032 / 5,641,032 | 0 |
| sea | 137 / 137 | 778,895 / 778,895 | 0 |

`node tools/repro-floor-sphere-native.mjs [output-directory]` with Chrome configured reproduces it. No raster suppression is active when images are drawn; an optional load-only hook must restore before capture (asserted by the tool). The unmodified compiled current-head budget receipt is recorded separately; no PASS is inferred from these source-paired pictures.
## Compiled current-head budget

Unmodified stock gate on `6619fce8be91e8ea1ecf0fa7c78446f5b9ae6062`: live **285 draws / 3,046,047 triangles / 0 errors**, candidate **285 draws / 3,046,047 triangles / 0 errors**. Two same-revision live probes and four distinct completed frames per probe/candidate; default limits, no allowances or sampler edits, no load/raster hook. [Raw receipt](budget.txt). This fixed budget placement is not a walking hardware frame-pacing test. The tiny helper CPU reduction and this budget do not establish the cause of historical live16 ~33 ms frames, heat or steady-60fps capability.
