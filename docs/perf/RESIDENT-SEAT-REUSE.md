# Resident seat-preparation storage reuse

Baseline: published 0.0.18 · 421d34b, https://ael-dev3.github.io/Tervain/.

The earlier mud/water-crossing CPU investigation in #470 included resident seat preparation. This change removes repeat allocations from that work; it does **not** establish that the complete recorded hitch is fixed.

`measureSeatSteps` skins the same candidate vertices at three moments of the sitting clip. Each moment previously cloned a new vector for every candidate. Keep one array of candidate vectors and overwrite it in source order before each sort instead. Sorting, low-surface selection, arithmetic and yield boundaries remain the same.

```sh
node tools/repro-resident-seat-reuse.mjs resident-seat-proof.json 421d34b
npx vitest run tests/presentation/residentSeatPreparation.test.ts tests/presentation/residentRetargetPreparation.test.ts tests/presentation/residentArrivals.test.ts
```

The repro loads the delivered models, rigs and motion clip. It instruments `sum.clone()` at the same call site in both baseline and candidate source, then consumes the actual seat-preparation generators. It asserts exact seat-coordinate equality and unchanged generator-turn counts, along with the allocation reduction. Instrumentation is confined to the repro loader; production has no counter.

| Resident | Candidate-vector clones before | After | Generator turns before/after |
| --- | ---: | ---: | ---: |
| rillford-reeve | 40,041 | 13,347 | 292 / 292 |
| ash-recorder | 25,464 | 8,488 | 176 / 176 |
| Total | 65,505 | 21,835 | 468 / 468 |

**43,670 fewer vector allocations**, a 66.7% reduction at this site, for these two preparations. Every returned x/y/z number compares exactly equal. The unchanged-output proof is numerical; no visual assets or animations change.

[Complete receipt](proofs/resident-seat-reuse/report.json).

Validation: 17 seat/retarget/arrival tests pass and the production build passes. This is a real-asset source replay, not a measurement of allocations per rendered frame, hardware FPS, total garbage collection, or the entire mud/water crossing. Other seat preparation allocations and sorting remain.
