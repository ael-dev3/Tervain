# Yield during resident hand-surface preparation

Candidate `24ca7047fc0df138d7fa77614df02434d782b937`, base published 0.0.39 `3596f1e8b`. The published walk-fence simulation trace found a 15.3 ms generator resume (separate run 18.9 ms) containing head-weight repair and initial finger-surface construction. The 3 ms arrival scheduler checks time only between resumes. This patch adds a yield after head repair, chunks the initial weight copy into 512-vertex batches, and welds/builds hand adjacency in 512-vertex/512-triangle batches. It preserves arithmetic, traversal and Set order; no draw/material/animation/geometry changes or budget allowances.

## Regression

Delivered quarry-foreman / maintenance-worker plans previously read 138,000 / 137,982 triangle indices in a single resume. The test now bounds this at 1,536; old code fails. Golden SHA256s cover complete hand descriptors, joint indices and float weights and remain identical. 18 relevant tests, typecheck and build pass.

## Native proof

Both full planners run on 17 actual preparation inputs before installation in one native High world. Hands match structurally and typed arrays match element-for-element; captured queue is empty, no resident fallback warnings or console errors. The harness switches the already-proven identical plan content in the installed candidate and renders normal post/MSAA, frozen environment, five poses with two repeats per mode. Twenty RGB PNGs match exactly. This is output equality, not proof that independent asynchronous worlds adopt at the same time. The first attempt lost its browser connection; only the completed retry is used. Setup exports compact equality/count records rather than entire plan arrays. Production source hashes identify the capture source, which was unchanged when committed.

| Pose | Draws each mode | Triangles each mode | Changed RGB pixels |
| --- | ---: | ---: | ---: |
| forest | 872 | 12992441 | 0 |
| fence | 683 | 8353879 | 0 |
| run-round | 267 | 2701511 | 0 |
| bow | 316 | 3210504 | 0 |
| village | 623 | 6666786 | 0 |

## Warm complete-plan CPU, not frame timing

Three fresh V8 processes, three warmups and 24 rotating original/candidate measurements per model per process (72 each). Each measurement runs all generator resumes to completion and compares complete results. Timings include iterator/clock overhead. These are complete finger-planner helper times, not GPU, Mac, presented-frame or heat measurements. More yields add overhead, and later synchronous planning phases remain. This patch does **not** claim every resume fits 3 ms or total CPU decreases.

| Model / mode | Total mean ms | Total p95 ms | Mean largest resume ms | p95 largest resume ms | Resumes |
| --- | ---: | ---: | ---: | ---: | ---: |
| quarry-foreman / before | 23.404 | 33.750 | 3.701 | 6.256 | 23 |
| quarry-foreman / after | 23.466 | 31.797 | 3.437 | 5.663 | 414 |
| maintenance-worker / before | 16.886 | 22.332 | 2.295 | 4.683 | 34 |
| maintenance-worker / after | 17.500 | 24.228 | 2.240 | 5.061 | 461 |

## Budget and scope

Unmodified default compiled budget receipt on the candidate is in [budget.txt](budget.txt); no init hook or allowance. Draws/triangles must not increase. Native captures use High 640×360 DPR1; stock budget uses its fixed Mac-size DPR2 placement, so absolute counts differ. Shader code/taps and final buffers remain unchanged. This repairs a deterministic scheduling gap, not proven attribution or removal of historical live16 ~33 ms hardware stalls. Head repair itself and later finger algorithms remain future targets.

Reproduce from feature/proof checkout with dependencies and configured Chrome: `node tools/repro-resident-finger-surface.mjs [output-directory]`, `node tools/repro-resident-finger-surface-cpu.mjs [output-directory]`. Native dual work is proof-only and provides no timing evidence. CPU tool removes its temporary source/test fixtures. Normal raster must be restored/asserted before images.
