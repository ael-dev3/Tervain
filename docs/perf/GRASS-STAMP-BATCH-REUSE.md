# Reuse grass interaction stamp batches

Published 0.0.18 · 421d34b constructs a temporary stamp list for each fixed interaction-field step, plus separate overflow lists. Reuse one private batch array, preserving mover-before-queued-stamp order and the 48-entry shader limit. Clear scratch references in `finally`; pending footprints still drain only after successful draws, so render failures retain them for retry.

## Reproduction

```sh
node tools/repro-live-grass-trample-batches.mjs --out grass-trample-batch-proof
```

The default target is [live Pages](https://ael-dev3.github.io/Tervain/). The script captures the native interaction field's constructor and configuration, then runs fresh native/baseline/candidate fields through 120 scripted moving-focus updates, a 103-stamp burst and a catch-up step. Each GPU pass is rendered through software WebGL. Target order and uniforms must match native, as must exact half-float field values after every update. Nonzero push/flatten values are required.

Count distinct batch arrays passed to the actual `stampPass` method. This does not count intermediate slices or all JavaScript allocations, and is not a heap/GC measurement. Target-tuple and shift-vector counts are unchanged controls; this change is independent of their separate reuse patch.

Each final replay field is bound into native shared uniforms for endpoint post-processing/MSAA images. Preparation is temporarily suppressed for these frozen captures and binding is asserted, then restored afterward. GPU readbacks belong only to this diagnostic, never production or timing-only gates.

Add `--candidate-ref 421d34b` for an unchanged-source control. It must exit nonzero because repeated batch construction remains.

## Matched result

[Report](../../proofs/grass-trample-batches/report.json) · [unchanged-source control](../../proofs/grass-trample-batches/unchanged-source-control.json) · [before](../../proofs/grass-trample-batches/before.png) · [after](../../proofs/grass-trample-batches/after.png)

| 120 moving-focus updates | Baseline | Candidate |
| --- | ---: | ---: |
| Distinct stamp-batch argument arrays | 64 | 1 |
| Rendered passes / scroll passes | 70 / 6 | 70 / 6 |
| Queued stamps / remaining | 103 / 0 | 103 / 0 |
| Target tuples (unchanged control) | 71 | 71 |
| Shift-vector creation sites (unchanged control) | 120 | 120 |
| Matched scene draws | 245 | 245 |
| Matched scene triangles | 1,889,302 | 1,889,302 |

Native, baseline and candidate pass sequences match exactly, SHA-256 `fc5260d0a5aab47c74e3c4adbfd036ef13c8c4b2fe6599018158290f29777f15`. All-frame field bytes match exactly, SHA-256 `1ef61705da609ae1d732f233f2ffc0df1e9fa216c31cd67d46efd4d4ce3c6cdd`. The native low-quality field is 64×64 over 28 m; bound-field endpoint pixels are identical. The unchanged-source control retains 64 batch arrays and correctly fails the reduction assertion.

Validation: eight interaction-field tests pass, including queued-value ownership, batching, catch-up, pending-stamp retention after failure and renderer-state restoration; type-check and production build pass.

## Scope

Native low-quality field configuration, scripted grove probe, real GPU passes through software WebGL. This is exact data/pixel and object-identity evidence, not a hardware FPS, GC-stall or M5 thermal result. Tree/grass quality and >25 ms frame pacing remain open.
