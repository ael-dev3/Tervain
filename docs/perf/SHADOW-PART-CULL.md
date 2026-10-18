# Independent tree-part shadow culling — candidate

Live reference: 0.0.28 · `22b9fd1`. Candidate application source: `a020898ce`.

A tree's union envelope admits both its wood and leaf instance into a shadow LOD. A crown can reach the sun volume while the trunk is entirely outside it. The batch-level rejection cannot discard that trunk when another trunk in the batch reaches the volume.

The candidate packs each part independently using the already cached, immutable placement spheres. It retains the existing two-metre wind margin and one-metre reference-volume drift margin. Visibility is cached until that guarded volume changes. Geometry, materials, shadow LOD weights, dither intervals and shaders are unchanged. The cache uses six bytes per selected tree, plus fixed per-batch state.

## Native software renders

Seven adjacent High pairs, 492×320, native post processing and 4× MSAA, frozen reduced-motion pose, hour 15. The path starts at (-55, 70) and heads west; the final two views turn the camera at the starting point.

| Walk metres / turn radians | Draws before → after | Triangles before → after | Changed RGBA channels |
| --- | ---: | ---: | ---: |
| 0 / 0 | 364 → 364 | 5,848,988 → 5,822,133 | 0 |
| 10 / 0 | 354 → 354 | 5,759,954 → 5,723,588 | 0 |
| 20 / 0 | 348 → 348 | 5,506,485 → 5,489,630 | 0 |
| 40 / 0 | 316 → 315 | 4,914,246 → 4,903,656 | 0 |
| 80 / 0 | 271 → 271 | 3,396,477 → 3,393,961 | 0 |
| 0 / −0.6 | 375 → 375 | 6,512,391 → 6,481,249 | 0 |
| 0 / +0.6 | 263 → 263 | 3,884,710 → 3,859,646 | 0 |

Zero console errors. Both PNG encodings also have identical SHA-256 digests in every pair; one copy per view is stored in [the proof directory](proofs/shadow-part-cull/). Full costs, removed-instance records and digests are in [renders.json](proofs/shadow-part-cull/renders.json).

This is a controlled live-render packing adapter, not a two-binary image comparison. It restores the original instance matrices, coverage and counts before selecting each next pose. Initial loading draws were suppressed; all recorded warm and measured renders use restored native WebGL entrypoints. The candidate's production packing and sun-drift invalidation are separately covered by the integration regression. No hardware frame-time, heat or Mac 60 fps claim follows from these images.

## CPU status — confirmation pending

A warmed component experiment uses the historical pine integration fixture, not the current live asset population. Each independent process warms 10,800 updates, then measures 1,200 forest-selection updates using process CPU time, in A/B/B/A order.

| Pair | Before average / p95 ms | After average / p95 ms |
| --- | ---: | ---: |
| 1 | 0.163535 / 0.190 | 0.191713 / 0.281 |
| 2 | 0.161602 / 0.181 | 0.170381 / 0.200 |

These results increase, so they do **not** establish a CPU win. [Raw samples' summaries](proofs/shadow-part-cull/component-warm.json). The current compiled app was also measured on the same first-80-metre path, with 1,200 warm-up and 1,200 measured updates. Draws, clears and framebuffer blits are suppressed only for this CPU phase. These are wall-clock JS update/submission durations; they include driver calls and scheduling, and are not GPU or Apple CPU measurements.

| Compiled run | World average / p95 ms | Submission average / p95 ms | Combined average / p95 ms |
| --- | ---: | ---: | ---: |
| Initial candidate | 0.7560 / 1.1 | 3.1898 / 4.2 | 3.9458 / 5.2 |
| Live baseline | 0.7176 / 1.1 | 2.9476 / 3.6 | 3.6652 / 4.6 |
| Candidate after baseline | 0.7240 / 1.1 | 2.9539 / 3.6 | 3.6779 / 4.7 |

The immediate baseline-then-build pair adds 0.01275 ms on average and 0.1 ms at p95; it does not prove a CPU reduction. The earlier candidate run is retained rather than discarded. The second live baseline did not produce a measurement: Pages moved to 0.0.29 · `4b4982b`, while that browser requested the removed `world-dNS2xJIy.js` chunk (HTTP 404). This is a load failure, not a CPU sample. Rebase and repeat against the new published revision before clearing the candidate. Raw reports are in the proof directory. Keep the candidate draft until the CPU result is reviewed and the full exact-head stock budget receipt is available; the seven-pose count comparison above is not that receipt.

## Regression and reproduction

The integration test rejects off-volume packed parts individually, checks independent wood/leaf counts, and retains the existing idle-camera, shadow-volume drift and re-entry checks. It fails on the original production path (`solitary-pine:1:foliage:shadow` remains outside the guarded volume). The helper test covers the exact wind/drift boundary. All 22 relevant tests, type-check and the production build pass.

Run the focused tests:

```sh
npx vitest run tests/presentation/shadowBounds.test.ts tests/presentation/pineForestIntegration.test.ts
npm run typecheck
```

With Chrome configured for software WebGL, run the native proof driver with `REPRO_INIT_FILE=tools/shadow-part-capture-init.js`; pass an output directory, the published URL and the exact revision to `tools/prove-shadow-part-cull.mjs`. The driver rejects revision drift, any differing output byte, any added draw/triangle and console errors. The loading helper is optional; it restores native rasterization before recording.
