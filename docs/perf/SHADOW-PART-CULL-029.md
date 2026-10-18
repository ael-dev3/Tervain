# Shadow-part culling: current-release confirmation

Candidate: `cbfdc10c86c9fe10f4fe298458ca746cf61c1a67` (#675). Baseline application: 0.0.29 · `4b4982b`; subsequent main `d244d39` changes only performance documentation, so application source is identical. Earlier 0.0.28 trials remain in the [historical receipt](https://github.com/ael-dev3/Tervain/blob/c3a7bdfd3/docs/perf/SHADOW-PART-CULL.md), including slower CPU observations.

## CPU confirmation

The baseline and actual compiled candidate each run 2,400 warmup updates and 3,000 measured updates, High, full motion, over the same first 80 metres of a woods path. Eight 750-frame blocks use order A,A,B,B,B,A,B,A. Only this CPU phase suppresses draws, clears and framebuffer blits. Per-frame JS phase durations include scheduling; Chrome ThreadTime measures actual main-thread CPU per block including protocol overhead. Neither is hardware GPU timing.

| Pooled measurement | Baseline | Candidate |
| --- | ---: | ---: |
| World JS average / p95 ms | 0.906 / 2.6 | 0.796 / 1.7 |
| Submission JS average / p95 ms | 3.595 / 9.4 | 3.288 / 6.5 |
| Combined JS average / p95 ms | 4.501 / 12.1 | 4.085 / 8.1 |
| Main-thread CPU ms per frame | 4.498 | 4.086 |
| Console errors | 0 | 0 |

| Block | Variant | Combined JS average / p95 ms | Thread CPU ms/frame |
| --- | --- | ---: | ---: |
| 1 | A | 3.789 / 4.7 | 3.770 |
| 2 | A | 6.701 / 19.1 | 6.721 |
| 3 | B | 5.062 / 12.3 | 5.073 |
| 4 | B | 4.138 / 6.2 | 4.130 |
| 5 | B | 3.911 / 4.8 | 3.909 |
| 6 | A | 4.077 / 5.4 | 4.063 |
| 7 | B | 3.226 / 3.7 | 3.231 |
| 8 | A | 3.437 / 4.2 | 3.436 |

There is no reproduced net CPU regression in these balanced controls. A/A spread is large: do not attribute the pooled difference entirely to culling or claim a precise speedup. Async streaming and runtime scheduling are not held constant by a GPU-suppressed update replay. [All raw frame timings](proofs/shadow-part-cull-029/cpu.json.gz) and the [driver](../../tools/paired-shadow-cpu.mjs) are retained.

## Native rendered pairs

High, 492×320 DPR1, native post-processing/MSAA4, frozen reduced-motion poses. A controlled packing adapter evaluates the same independently guarded part bounds on the baseline's own geometry. Initial loading draw suppression is restored before every native warm/measured render. No world update occurs within a pair; original counts/matrices/coverage are restored before moving to the next pose. These are controlled packing pairs, not two-binary image comparisons.

| Woods metres / turn | Draws before → after | Triangles before → after | Changed RGBA channels |
| --- | ---: | ---: | ---: |
| 0 / 0 | 364 → 364 | 5,848,988 → 5,822,133 | 0 |
| 10 / 0 | 354 → 354 | 5,759,954 → 5,723,588 | 0 |
| 20 / 0 | 348 → 348 | 5,506,485 → 5,489,630 | 0 |
| 40 / 0 | 316 → 315 | 4,914,246 → 4,903,656 | 0 |
| 80 / 0 | 271 → 271 | 3,396,477 → 3,393,961 | 0 |
| 0 / −0.6 | 375 → 375 | 6,512,391 → 6,481,249 | 0 |
| 0 / +0.6 | 263 → 263 | 3,884,710 → 3,859,646 | 0 |

[Raw counters, per-part exclusions and paired image hashes](proofs/shadow-part-cull-029/renders.json). Matching PNG byte hashes permit one retained image per pair: [0](proofs/shadow-part-cull-029/view-0.png), [1](proofs/shadow-part-cull-029/view-1.png), [2](proofs/shadow-part-cull-029/view-2.png), [3](proofs/shadow-part-cull-029/view-3.png), [4](proofs/shadow-part-cull-029/view-4.png), [5](proofs/shadow-part-cull-029/view-5.png), [6](proofs/shadow-part-cull-029/view-6.png). Console errors: zero. Source geometry and shader/tap counts: unchanged. Cache masks add six bytes/tree (2,706 bytes for 451 trees), excluding object headers and fixed per-batch counters.

## Exact-head budget status

The unmodified sampling policy with #673's startup correction completed and **failed**: live d244d39 reported 226 draws / 2,414,180 triangles; candidate cbfdc10c8 reported 285 / 3,048,306, zero errors and matching candidate revision. No PASS was issued.

A follow-up live trace reproduced the same live pose at both 285 / 3,061,335 and 226 / 2,414,180. All four 1.5-second budget reads sampled the identical renderer frame 137 / simulation step 32, whose interval was 18.316 seconds. #678 replaces repeated raw-counter reads with distinct completed-frame samples; it retains both live probes, maximum-budget comparison and all rejection thresholds. A native rerun with that producer and #673's startup correction is pending. This receipt does not substitute a controlled seven-view result for that full budget result.

## Root follow-up

All 451 registered roots were audited independently at each of three LODs, with a five-million-operation cap: complete, zero unsupported roots/candidates at every level. Maximum support gap: −0.0679 / −0.0668 / −0.0286 metres for LOD0/1/2. This rules out the sampled rest-geometry root contact bug on this revision; it is not a wind-deformed or visual quality rating. [Raw root reports](proofs/shadow-part-cull-029/roots.json.gz).
