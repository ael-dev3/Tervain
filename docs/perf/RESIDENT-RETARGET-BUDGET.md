# Smaller resident retargeting turns

A CPU-only walk across the village channel on published [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/) exposed ongoing resident preparation alongside ordinary simulation. The 300 fixed steps walk from x≈−30 to x≈−21.87 at z=40, including shallow water. Rendering is frozen for this CPU isolation; its diagnostic wall times are **not presented frame times or Mac hardware measurements**. The uploaded playtest has more near-duplicate frames around the reported crossing; that observation alone cannot attribute the hitch to water rendering.

The [scrubbed CPU profile](proofs/resident-retarget-budget/live-crossing-cpu.json) includes resident retargeting, skin preparation and garbage collection. [Step observations](proofs/resident-retarget-budget/live-crossing-steps.json) retain coordinates and water depth. A separate sampled render probe found no shader links during this crossing; that rules out a new link in those samples, not every possible route or first-use state.

## Change and deterministic proof

`retargetClipSteps` baked eight complete source poses, including the iterative head-pitch limit, before yielding to the arrivals scheduler. The scheduler cannot enforce its 3 ms allowance until the generator returns. Yield after each complete source pose instead. The scheduler can still consume several inexpensive poses within its existing budget; the output samples and their order stay identical.

The delivered ash-recorder rig and three delivered motion clips give:

| Clip | Maximum source poses per turn, before → after | Output hash |
| --- | ---: | --- |
| walk.quick | 8 → 1 | identical |
| talk.chat | 8 → 1 | identical |
| sit.idle.m | 8 → 1 | identical |

The comparison hashes every track name, time and value plus cycle/hips metadata. It counts actual source interpolant evaluations per generator turn. [Receipt](proofs/resident-retarget-budget/report.json).

Diagnostic Node p95 turn times were 2.48→0.16 ms, 0.38→0.06 ms and 0.43→0.07 ms respectively. The walk's worst turn remains 14.88 ms (before 16.88 ms): later stages, collection and scheduling can still overrun. This is a smaller indivisible preparation unit, **not proof that the recorded mud/water hitch is fully fixed**.

```sh
node tools/repro-resident-retarget-budget.mjs artifacts/retarget.json 421d34b
node tools/profile-live-mud-crossing.mjs https://ael-dev3.github.io/Tervain/ artifacts/crossing
npx vitest run tests/presentation/residentRetargetPreparation.test.ts tests/presentation/residentArrivals.test.ts
npm run build
```

The first command compares the published source with the candidate using delivered assets; the second profiles the published build itself. Existing preparation and arrivals tests: 15 passed. Production build passed. Hardware/video crossing verification remains open.

## Encoded playtest cadence around the crossing

A separate analysis of the supplied 60 fps playtest counts near-repeat scene-region images, using a mean absolute luma-change threshold of 0.2/255 after a fixed 480×270 analysis scale. The crop excludes the HUD; source timestamps and decoded frame counts must match.

| Interval | Near-repeat pairs / measured pairs | Longest consecutive near-repeat run |
| --- | ---: | ---: |
| 24–26 s | 4 / 119 | 1 |
| 26–28 s | 15 / 120 | 1 |
| 28–30 s | 4 / 120 | 1 |

This quantifies worse encoded cadence at the reported crossing. The observed near-repeats are isolated in this sample, rather than a long run of unchanged images. Recording/encoding and scene motion can affect the count; it must not be converted into engine frame times or a claimed hardware FPS result. [Per-frame receipt](proofs/resident-retarget-budget/playtest-cadence.json).

```sh
node tools/analyze-video-cadence.mjs playtest-0.0.18.mp4 cadence.json 24 6
```

The CPU-only trace above also includes the initial synthetic key event/audio-unlock work and runs its fixed steps synchronously. Async preparations can therefore remain pending across the step batch; it is workload isolation, not a replay of 26 seconds of real rendered play. The source-pose and allocation comparisons remain deterministic proofs of those specific costs, while complete hitch attribution stays open.
