# Resident hand-component membership scans

Candidate `6bf8b3dc4b741bf077894fa45167a9ff907c2180`, released 0.0.40 base `b2635c4c3`. During first model preparation, `planResidentFingersSteps` chooses a hand's connected component. Its carried-node array is defined by the same `handWeight(surface.nodes[n], joint) >= 0.6` predicate immediately above scoring. Searching that array for every component node repeats a linear scan. Use the predicate directly and count in place, avoiding both the search and copied/filtered component arrays. No set, scratch buffer, new yield, changed score/tie order, geometry, skin weights, shader or animation changes. Independent of the pending head/seat/hand-support preparation PRs.

## Repro and bounds

The read-only probe covers all 17 shipped models. Raw village-baker preparation makes **1,744** numeric membership queries with **1,502,334** reference scan length; ford-bandit-a **1,335 / 843,264**. Reference lengths are calculated from first-match indices (or full length for misses), not measured processor instructions. Candidate removes the linear queries; constant-size four-slot weight checks and node traversal still do work. Connected hands have one component and never enter the scoring comparison.

The two shipped-asset tests fail on actual original code (expected zero queries, got 1,744 / 1,335) and pass on candidate while retaining complete descriptors, joint-index and float-weight buffer golden SHA256s. Existing finger tests pass across the asset set: **seven relevant tests and build pass**. The old source was restored after the failing regression run.

## Helper CPU

Three fresh warmed V8 processes, three warmups, 24 rotating preparations per model/mode per process (72 each), before/candidate/unchanged-before control. Delivered rig inputs are identical; every complete output hash matches. The affected resume is index 23 for baker and index 1 for bandit in this pinned source, and includes other unchanged hand analysis as well as component scoring. Reeve is a connected-hand control. Timings include iterator/clock overhead and allocation/GC effects. They are **helper timings, not real display-frame or Mac/GPU/heat measurements**. This is first-use cached model preparation, not a steady-state per-frame saving.

| Model / mode | Total mean ms | Total p95 ms | Largest-resume p95 ms | Relevant resume mean ms |
| --- | ---: | ---: | ---: | ---: |
| village-baker / before | 21.401 | 27.159 | 4.146 | 2.662 |
| village-baker / predicate | 20.958 | 26.432 | 3.071 | 1.871 |
| village-baker / control | 21.425 | 25.634 | 3.655 | 2.666 |
| ford-bandit-a / before | 10.181 | 11.414 | 2.261 | 1.816 |
| ford-bandit-a / predicate | 9.591 | 10.443 | 1.937 | 1.376 |
| ford-bandit-a / control | 10.165 | 11.493 | 2.129 | 1.809 |
| rillford-reeve / before | 6.786 | 7.342 | 1.330 | 0.902 |
| rillford-reeve / predicate | 6.731 | 7.371 | 1.316 | 0.902 |
| rillford-reeve / control | 6.792 | 7.559 | 1.354 | 0.899 |

The affected baker resume improves about 30%, bandit about 24%; complete-helper mean improves about 2% / 6%. Control variation is preserved, not described as a speedup. These results do not close the historical ~33 ms stall, the traced initial head/surface overrun, or the separate hand-support/seat hotspots.

## Native and budget proof

17 actual complete native preparation inputs compare serialized hand descriptors and every joint/weight element before installation: all equal, queue empty, no resident fallback warnings or console errors. Baseline actual invocations make **4,963 linear queries / 2,769,021 reference scan length**; candidate makes no such linear queries. The baseline proof counter uses an extra `indexOf` to derive reference lengths; dual work and counters are intentionally excluded from CPU timing.

A shared native High world receives the already-verified identical plan data for each image mode; 20 repeated same-pose PNGs are RGB-identical with normal post/MSAA raster restored/asserted, fixed time/wind, rebuilt shadow/reflection state. This proves output equality, not independently scheduled adoption timing. Since plan content already matches, switching the image mode intentionally leaves numerical state unchanged.

| Pose | Draws each | Triangles each | Changed RGB pixels |
| --- | ---: | ---: | ---: |
| forest | 878 | 12965076 | 0 |
| fence | 689 | 8328926 | 0 |
| run-round | 269 | 2699742 | 0 |
| bow | 316 | 3209466 | 0 |
| village | 623 | 6656282 | 0 |

[Stock default compiled gate receipt](budget.txt) is on this exact head with no allowances, init hook or sampler edits. Software WebGL budget, not hardware pacing. Stock placement is Retina-size DPR2, while native images are 640×360 DPR1, so absolute counts differ. Shader code/taps and final GPU buffers stay unchanged. No historical stall-closure or 10/10 claim.

Reproduce with dependencies and configured Chrome: `node tools/repro-resident-hand-membership-native.mjs [output-directory]`, `node tools/repro-resident-hand-membership-cpu.mjs [output-directory]`. Fetch the pinned baseline in shallow checkouts. CPU tool checks/removes private temporary helper/test fixtures and runs one process at a time. Native dual work supplies no performance timing.
