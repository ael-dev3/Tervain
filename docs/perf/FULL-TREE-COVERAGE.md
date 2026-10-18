# Skip unused tree fade noise

While investigating remaining non-oak crown shimmer and detail transitions on the published 0.0.22 build, the distance-visibility shader exposed a separate cost: it computes its noise even when an instance has complete coverage. High trees normally retain their near source at every visible distance, so a normal tree interval is `[0, 1]`. The noise is always in `[0, 1)`, and cannot discard a fragment in that interval.

The change evaluates it only for partial intervals. The active fade calculation, cut-out, world anchoring, geometry, density, lighting and LOD bands are unchanged. The guard applies to the shared distance-visibility hook; it does not change oak or fir card attachment. The shade-only leaf pass already has no distance rejection and an optimizing compiler can remove its unused noise; no savings are claimed for that pass.

This is a shader-work reduction, **not a fix for general shimmer or LOD silhouette differences**, and not a hardware FPS claim.

## Regression fixture

The fixture compiles the actual production material hooks for colour, depth and distance materials and tests seven intervals with both single-sample and four-sample targets: 42 before/after pairs. It includes complete, extended-complete, partial and empty intervals.

All 42 pairs have byte-identical colour output. In each full-coverage plane, 4,096 pixels report executed hash code before and zero afterward. Partial and empty masks remain identical. Instrumentation makes hash execution observable in a separate output; these are controlled shader execution counters, not whole-scene fragment totals or GPU timings.

[Fixture receipt](proofs/full-tree-coverage/fixture.json).

## Native forest replay

The native replay uses published **0.0.22 · d40777b**, High, 640×360 with the normal post-processing and four-sample target. Three camera poses span 0.0867 m of forward travel and 0.344° of rotation. This is a bounded correctness replay, not a full forest route or shimmer-quality gate. Camera translation and rotation are synthetic samples; clocks, wind, actors and grain are held fixed to permit exact comparisons. The inactive adapter must match the unmodified native draw before any before/after pair is accepted. Each sample is captured before → after → restored before, with matching draw/triangle/texture counters and exact restored RGB. Empty or invalid WebGL output fails the run.

All three pairs have **zero changed RGB pixels**, and every restored image matches its original baseline. Their warmed native draws are **280 / 283 / 284**, triangles **5,340,939 / 5,343,692 / 5,357,851**, and texture count **274** in both variants. These are cached capture draws after view preparation, with shadow-map updates held; they are not a complete play-frame cost measurement.

The submitted coverage ledger contains 543–546 complete and 24 partial instances across the render meshes, including duplicated depth/colour parts. Those counts are neither unique trees nor shaded fragment counts and must not be converted to a whole-frame saving percentage. GPU compilers may schedule or optimize branches differently. A paired hardware play gate remains required, especially for transition-heavy scenes where partial instances still execute the original noise.

[Native receipt](proofs/full-tree-coverage/native.json) · [Before](proofs/full-tree-coverage/before.png) · [After](proofs/full-tree-coverage/after.png).

[Lossless comparison](proofs/full-tree-coverage/motion-lossless.mp4) · [Browser preview](proofs/full-tree-coverage/motion-preview.mp4). Before is left, after is right; playback is slowed to five frames/second for inspection. The lossy preview is not metric input. [Decode verification](proofs/full-tree-coverage/video-verification.json) checks the lossless clip against the source RGB.

29 focused tests and the production build/type-check pass. Core change: `13c594eb4`.

## Reproduce

```sh
node tools/repro-tree-full-coverage.mjs tree-coverage-fixture
node tools/repro-live-full-tree-coverage.mjs \
  --url https://ael-dev3.github.io/Tervain/ \
  --out tree-coverage-native --frames 3
node tools/encode-full-tree-coverage.mjs tree-coverage-native
npm test -- --run tests/presentation/distanceVisibility.test.ts \
  tests/presentation/foliageEngine.test.ts tests/presentation/treeBarkDetail.test.ts
npm run build
```

The native adapter requires the original distance rule and fails if it cannot find it. It compares one shared compiled program via a proof uniform; the production fixture independently compiles the candidate hook. No timing measurements are taken during software correctness captures.
