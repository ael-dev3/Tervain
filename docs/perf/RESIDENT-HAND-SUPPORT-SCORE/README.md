# Cache resident hand-support projection scores

Head `b4c19a306deb50e1568ee855613d6e2d7833c56c`, published source base `3596f1e8b` (0.0.39). `residentHands` finds the outermost hand vertices along 160 directions, for open/relaxed/fist/work-grip surfaces. Each candidate previously reprojected the unchanged current winner. Cache its score and start at candidate 1. Strict comparison and original tie order remain. Yield placement, contacts, model geometry/materials/shaders and animation samples are unchanged.

## Published-build CPU lead, not a solved frame stall

A read-only 600-step simulation profile on published 0.0.39 crossed the walk-fence stretch x=-2, z≈40→33.9. Its slowest step was **35.2 ms at z≈38.667**. [Steps](live-simulation-steps.json) and [normalized CPU profile](live-simulation.cpuprofile) retain the data. `residentHands` had 96.518 ms of sampled self time across the whole diagnostic; retargeting, seat measurements, hidden-surface preparation, GC and texture uploads also appear. [Bundle attribution](live-attribution.json) records public source offsets/hash. These are profiled CPU-only simulation steps with presentation frozen, **not 60 Hz rendered frame evidence, GPU time, Apple hardware or heat**. Profiling and scheduling affect elapsed time. The exact 35.2 ms step was not aligned to stage/GC timestamps and is not causally assigned to this helper.

The last control originally labelled bow used **KeyQ/dodge**, not attack. It is explicitly renamed `equipped-bow-dodge-control`, excluded from bow claims, and retained transparently because the raw CPU samples cover it too. Historical live16 ~33 ms walk/run/bow causes remain open. `node tools/repro-live-arrival-routes.mjs [build-URL] [output-directory]` reruns the explicitly named walk/run/dodge-control CPU diagnostic with Chrome; no draw/release claim is made.

## Aligned walk/run follow-up: a concrete preparation overrun

A second diagnostic records per-step user timing markers, same-thread CPU clocks, sampled JS and preparation `next()` intervals. The [420-row partial result](live-aligned-walk-run.json) and [840 derived markers plus GC intervals](live-aligned-markers.json) contain relative clocks only; raw process/thread/session trace data stays private.

At hero (-2, 38.914), one walk step is **22.5 ms wall / 22.162 ms thread CPU**; preparation is **20.3 ms** with consecutive generator resumes **1.4 and 18.9 ms**. Only **0.91 ms of overlapping MinorGC** is recorded (an overlap, not extra cost). Samples point into `handSurface`, `planResidentFingersSteps`/`residentFingerPlanSteps`, `repairHeadWeights`/`headShare`, and hidden-surface work. The three-ms arrival scheduler cannot preempt a long `next()`: the head-weight repair and first hand-surface graph occur before a usable yield. The 18.9 ms spans several helpers; it is not all assigned to `handSurface`. This earlier preparation is a separate unresolved follow-up from the hand-support score cache.

This is a traced CPU simulation budget overrun at the relevant route, **not proven attribution of historical live16/Mac presented-frame stalls**. The first aligned run stopped at a verifier that read an old immutable inventory snapshot; its reported zero consumption was invalid, not evidence of failed firing. The partial walk/run data remains scoped as partial. A corrected independent replay completed **696 steps, two verified arrow releases (six arrows to four), unchanged build revision and zero console errors**: [full summary](live-aligned-complete.json). Its worst walk step at (-2, 37.402) was **19.0 ms wall / 18.478 ms thread CPU**, with **15.3 ms in one resident preparation resume**, including 1.265 ms overlapping MinorGC. Samples again include head-weight repair and initial hand-surface preparation. This confirms an uninterruptible preparation-budget overrun; it is separate from the score-cache optimization and remains unfixed here.


## Native regression and paired semantic proof

The two shipped-asset regressions fail on original code (largest hand-direction query counts **1,240,320 / 1,352,640**, expected below 750,000) and pass after (**620,160 / 676,320**). Hashes cover every selected hand vertex, centre and palm/finger axis. **25 relevant tests pass**, final focused tests/typecheck/build pass. Native actual resident preparation inputs in one High source world run both complete helper algorithms before installation; **18 pairs**, full contact objects exactly equal. The arrival queue is empty at capture. Summed paired preparation interval counters are **59,782,400 → 29,891,200 projections**, all pairs 2:1. World-space queries update Three matrix caches: the proof snapshots/restores ancestor/descendant local/world and bind-inverse caches so each algorithm starts from the same actual state, checks identical final cache state, then restores candidate state for installation. It does not pre-warm or fix production matrices. Proof-only doubled work/counters supply no timing evidence. Resident fallback warnings and a failed comparison are explicit proof failures, including errors caught by the arrival queue.

The capture camera looks away during preparation so the ordinary out-of-view handover can finish. No production visibility rule changes. Replacing the installed contact object members between the two **identical** results gives stable normal native post/MSAA images: five poses × original/candidate × two repeats = **20 RGB-identical PNGs**. One shared scene, not independently timed world loads; pose/arrival timing changes are not claimed tested by these images. Normal raster is restored/asserted before capture, clocks/cloud/wind fixed, shadow maps rebuilt and water reflection invalidated.

| Pose | Draws on each | Triangles on each | Changed RGB pixels |
| --- | ---: | ---: | ---: |
| forest | 872 | 12,992,441 | 0 |
| fence | 683 | 8,353,879 | 0 |
| run-round | 267 | 2,701,511 | 0 |
| bow | 316 | 3,210,504 | 0 |
| village | 623 | 6,666,786 | 0 |

## Isolated helper CPU

Three fresh V8 test processes, warmed original/candidate/unchanged-original, rotating 24 preparations/mode/model each (72/mode/model total). Delivered rig geometry and open/relaxed/fist shapes are shared across modes. Results are compared exactly. `largest resume` is the slowest generator `next()` in each preparation; p95 is over those preparation maxima, not rendered frames. Timings include helper generator/clock overhead. The source change adds no scratch buffers or objects and leaves yields unchanged.

| Model / mode | Mean preparation ms | p95 preparation ms | Mean largest resume ms | p95 largest resume ms |
| --- | ---: | ---: | ---: | ---: |
| rillford-reeve / before | 9.765 | 10.249 | 3.114 | 3.370 |
| rillford-reeve / after | 5.900 | 6.138 | 2.296 | 2.481 |
| rillford-reeve / control | 9.755 | 10.245 | 3.074 | 3.339 |
| ash-recorder / before | 8.880 | 9.771 | 2.472 | 2.941 |
| ash-recorder / after | 4.954 | 5.401 | 1.719 | 1.974 |
| ash-recorder / control | 9.013 | 10.070 | 2.531 | 3.072 |

The stock compiled default budget on the exact head passes: [raw receipt](budget.txt). No threshold allowance, capture hook or sampler changes. Its fixed 1440×900 DPR2 placement differs from the native 640×360 DPR1 views; absolute costs are not mixed. Shader code/texture taps/geometry/upload policy are unchanged. Full-frame CPU, hardware pacing and heat are not inferred from this budget.

From candidate/proof checkout with dependencies and configured Chrome: `node tools/repro-resident-hand-native.mjs [output-directory]`; `node tools/repro-resident-hand-cpu.mjs [output-directory]`. Fetch pinned base when shallow. CPU driver creates/removes private fixture modules and refuses existing files. Native tool compares real helper inputs before installation and checks actor preparation warnings as well as repeat stability.