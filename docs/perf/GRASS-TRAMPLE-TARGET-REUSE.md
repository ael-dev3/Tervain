# Grass interaction-field scratch reuse

Published 0.0.18 · 421d34b constructs a shift vector on every interaction-field update and a new two-element target tuple after every ping-pong draw. Keep one private shift vector, reset it at each update, and swap the two existing tuple entries in place. Texture ownership, target order, stamp batching, recovery and scrolling stay unchanged.

## Reproduction

```sh
node tools/repro-live-grass-trample-targets.mjs --out grass-trample-target-proof
```

The default target is [live Pages](https://ael-dev3.github.io/Tervain/). The script captures the native interaction field's constructor and configuration. It runs fresh native, actual baseline-source and candidate-source fields for 120 scripted moving-focus updates with a 103-stamp burst and a catch-up step. Every pass is rendered through software WebGL. Each pass's target order and uniforms must match native, and exact half-float field bytes must match after every update. Nonzero push/flatten channels are required.

The proof counts distinct private target tuples and instrumented update-local shift-vector creation-site executions. It does not measure heap allocation, GC or frame time. The candidate still constructs one shift vector and one target tuple when its field is created; those persist for its lifetime.

Each final replay field is bound into the native scene's shared trample uniforms for post-processing/MSAA screenshots. Scene preparation is temporarily suppressed during those frozen captures so it cannot replace the replay field; binding is asserted and preparation/uniforms are restored afterward. Diagnostic GPU readbacks occur only in this repro, never in production or timing-only gates.

Add `--candidate-ref 421d34b` for the unchanged-source control, which must exit nonzero because work remains unchanged.

## Matched receipt

[Report](../../proofs/grass-trample-targets/report.json) · [unchanged-source control](../../proofs/grass-trample-targets/unchanged-source-control.json) · [before](../../proofs/grass-trample-targets/before.png) · [after](../../proofs/grass-trample-targets/after.png)

| 120 moving-focus updates | Baseline | Candidate |
| --- | ---: | ---: |
| Distinct target tuples | 71 | 1 |
| Update-local shift-vector creation sites | 120 | 0 |
| GPU passes, including scrolls | 70 | 70 |
| Scroll passes | 6 | 6 |
| Queued brush stamps / remaining | 103 / 0 | 103 / 0 |
| Matched scene draws | 245 | 245 |
| Matched scene triangles | 1,889,302 | 1,889,302 |

The native low-quality field is 64×64 over 28 m. Native, baseline and candidate pass sequences match exactly (`fc5260d0a5aab47c74e3c4adbfd036ef13c8c4b2fe6599018158290f29777f15`). Field bytes across all 120 updates match exactly (`1ef61705da609ae1d732f233f2ffc0df1e9fa216c31cd67d46efd4d4ce3c6cdd`), as do the bound-field endpoint pixels. The unchanged-source control retains 71 tuples and 120 update-local vector creations and correctly fails the reduction assertion.

Validation: all eight interaction-field tests pass, including queued-stamp retention, batching, catch-up, recovery after renderer failure and renderer-state restoration. Type-check and production build pass. The first exploratory receipt was discarded because scene preparation could overwrite its bound replay field; only the corrected, binding-asserted receipt is attached here.

## Scope

Low-quality native field configuration and a scripted grove route. This is deterministic operation-count, field-data and pixel evidence, not a hardware FPS, GC-stall or M5 thermal receipt. It does not close tree/grass visual-quality or outstanding >25 ms frame-pacing targets.
