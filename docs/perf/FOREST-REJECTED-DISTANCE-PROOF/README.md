# Rejected-tree distance work

Runtime source `af6db3757ac37384a0f3920c9aa9b75a6a585bf6`. Only the distance/horizon prelude in `flora.ts` moves below the unchanged camera/shadow rejection. Hidden-tree regression fails on b317734 (557 unused horizon fades); shadow-only and final-horizon controls still pass. Twelve focused and 43 integration tests, typecheck and production build pass.

## Native scene equivalence

Seven High views: five forest walk samples, forest turn and sea. All packed state (instance counts, visibility, bounds, transforms, tints and coverage) matches both the native forest and the original refresh. Every before/after/restored RGB image matches exactly, with equal draws and triangles. These are controlled views with fixed wind, not a gameplay cadence clip or a repair for visible LOD/crown defects.

The pixel acquisition uses CLI revision `aa67c905d` on native published b317734. Subsequent commits change only the measurement CLI. Runtime `flora.ts` bytes match the final head exactly; both raw reports retain that hash. Its preliminary CPU figures repeatedly refresh a fixed camera through a dynamic environment and are **not** the headline performance result.

## Walking/turning CPU confirmation

The final CLI runs the exact original/candidate production refresh blocks with reconstructed **lexical bindings**, on shared native High batches in the actual compiled final-head build. All seven native state controls pass again. A 120-camera, 2.6 m/s, 60-Hz-step walk with yaw +0.003 radians/step is precomputed; camera construction, other world updates and GPU/draw submission are outside the timed component. The sun volume is fixed. Cameras repeat during timing. No allocation/API/work-counter observers run in the timed kernels.

Each mode warms 1,000 calls, then runs 12 rotated-order batches of 500 calls (6,000 samples per mode). Baseline B is an independent identical-code control. Elapsed JS timing includes clock/bookkeeping and scheduler effects. The per-call clock is quantized at approximately 0.1 ms; raw batch means are also retained. These are isolated reconstructed-kernel timings, **not integrated game frame times, Apple GPU results, FPS or heat evidence**.

| Mode | Mean elapsed ms/refresh | p95 ms/refresh |
| --- | ---: | ---: |
| before | 0.095717 | 0.200000 |
| after | 0.085617 | 0.200000 |
| control | 0.095850 | 0.200000 |

Work counters are separate from timing. The first forest view evaluates distance/horizon 451 → 207 times; all seven candidate counts are lower (207, 207, 209, 208, 208, 134, 234) with identical submitted geometry and shadow-only casters.

## Stock budget

`play-gate: PASS af6db3757` on the unchanged runner/sampler, normal startup, no repro initialization script. The sanitized log retains exact live/candidate revisions and max draw/triangle/error values. No shaders, texture sampling, geometry, materials, menus or art change. Existing allocations elsewhere remain.

## Reproduce

From the repository root:

```sh
node tools/repro-forest-rejected-distance.mjs --url BUILD_URL --ref b317734 --out proof
node tools/repro-forest-rejected-distance.mjs --url BUILD_URL --ref b317734 --cpu-only 1 --out cpu-proof
npm test -- tests/presentation/forestRejectedDistance.test.ts tests/presentation/distanceVisibility.test.ts tests/presentation/shadowBounds.test.ts
node tools/play-gate.mjs --url BUILD_URL --budget-url https://ael-dev3.github.io/Tervain/ --head af6db3757 --tag forest-rejected-budget --out budget-proof
```

Use software-WebGL Chrome through the repository CDP tools. The final CLI's default run includes seven image comparisons; `--cpu-only 1` does not. The raw CPU-only receipt explicitly records `pixelProofIncluded: false`; the images are the separate, runtime-byte-identical acquisition above.

## Rejected foliage hypothesis

Before this cost cut, a read-only live normal-motion probe sampled every wood/leaf vertex of the largest instance in eight tall templates across 17 wind phases: 2,635,612 vertex-phase observations, zero placement-box/sphere escapes, maximum displacement about 0.567 m. Native steady/gust uniforms were unchanged; movers and strike shakes were disabled. This excludes that sampled wind-bound explanation only, not all trees, weather, interactions or general pop-in. Its source and raw report are included; it is not a tree-quality clearance.
