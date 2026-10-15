# Tree shadow coverage uploads during camera turns

Published baseline: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/).
This addresses redundant work under the turn/streaming checklist item in #326; it does not establish the cause of a recorded hardware stall.

## Live reproduction

```sh
node tools/repro-live-shadow-coverage.mjs https://ael-dev3.github.io/Tervain/ live-shadow-coverage.json
```

After native world readiness, the check holds position and rotates the camera twelve times with the existing sun shadow volume and conservative window-style receiver policy. On the published baseline, each refresh marks 50 unchanged, nonempty caster coverage buffers dirty: 2,752 scheduled prefix bytes per refresh. These are inferred scheduled bytes, not measured GPU traffic; actual shadow-map updates can be less frequent. See [live receipt](../../proofs/tree-shadow-coverage/live18.json).

## Change

Compare coverage endpoints at their stored Float32 precision, and upload only changed caster coverage or a growing draw prefix. Shadow LOD selection, instance order, geometry, coverage values, materials and lighting are unchanged. A newly exposed prefix still uploads even if its cached CPU values happen to match.

## Rendered A/B check

```sh
node tools/repro-tree-shadow-coverage.mjs tree-shadow-coverage-proof
```

The source-backed High forest fixture loads the supplied pine models, builds the procedural catalog, installs the real shadow-only caster hooks, and renders through software WebGL. It checks five fixed-position camera turns followed by entry and movement through a near shadow-LOD blend. It counts actual caster coverage buffer uploads, compares every active coverage and instance-matrix bit, and compares rendered receiver frames at all seven steps. The final blend move must still upload changed coverage. PNGs, report and compressed raw traces are attached under [proofs/tree-shadow-coverage](../../proofs/tree-shadow-coverage).

Measured result: each of five turns drops from **6,200 to 0 actual coverage-upload bytes**, and **65 to 0 redundant dirty versions**. All seven rendered frames and active caster buffers are bit-identical; the comparison image has 35,818 non-background pixels. Draw calls and triangles match at each step. The final blend movement still uploads 3,152 bytes (baseline 6,328), retaining necessary updates. No WebGL errors occurred.

Validation: type-check and production build pass; both affected forest test files pass (22 tests, with the 15-test file rerun alone after one initial five-second timeout).

This is an isolated forest regression check, not final post-processing, visual approval, native GPU timing, or a hardware play-gate PASS. It makes no claim that the historical live16 missed refreshes or night/mud hitch are resolved.
