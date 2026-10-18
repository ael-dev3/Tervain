# Cache foliage mover slots alongside the shake cache

The mover array still resends six vec4 slots on every affected material submission after the separate shake cache. This change rebases the independent mover transport onto `5144dd39f`, preserving both the shake-matrix and single-shadow-matrix caches. It supersedes the conflicting proposal in #656.

Six single-member struct entries use Three's cached vec4 setters. All 24 GPU floats, the indexed six-mover loop, movement response, shadow geometry, texture sampling and draw order stay unchanged. A shared retained view follows both vector mutation and array replacement; no per-draw arrays are allocated. Colour, wood, shadow and forest-floor hooks use both caches.

## Current evidence

Published baseline: 0.0.23 · `5144dd3`, High forest. First moving renderer replay, 120 warm pairs and 120 measured pairs in alternating A/B order:

| Metric | Before | After |
| --- | ---: | ---: |
| Mover upload calls / frame, mean | 97.367 | 23.767 |
| Mover uniform payload bytes / frame, mean | 9,347.20 | 380.27 |
| Renderer thread CPU mean | 3.283 ms | 3.244 ms |
| Renderer thread CPU p95 | 5.042 ms | 5.233 ms |
| Maximum intended draw calls | 423 | 423 |
| Maximum intended triangles | 8,005,237 | 8,005,237 |
| Textures | 274 | 274 |
| Added wind arithmetic expressions / texture samples | 0 | 0 |

Every paired draw/triangle/texture count matches. The first CPU mean is slightly lower but p95 is higher; **CPU tail verification remains pending**. These are instrumented renderer-thread measurements with raster draws suppressed, not hardware GPU time, total game FPS, power use or Mac measurements. Uniform bytes mean GL API input payload, not measured bus traffic. `allUniformCalls` in the raw samples counts the instrumented vec4 upload methods only.

The eight compiled colour/shadow cases pass with exact RGB and GPU float values: unchanged slots, a moving slot, all six slots, expiry and array replacement. A same-time inactive control confirms the mover still deforms geometry. **Tradeoff:** changing all slots in a small scene increases individual setter calls (fixture 5 → 12) while reducing payload (480 → 192 bytes). The shared-program forest reduces both.

The first replay and compiled fixture results are in [the proof directory](proofs/foliage-mover-uniform-rebased). Fresh full-scene five-pose pixel proof and compiled-head deterministic gate are still pending; no native or play-gate PASS is claimed here yet.

## Reproduction

```sh
npx vitest run tests/presentation/foliageMoverUniform.test.ts tests/presentation/foliageShakeUniform.test.ts tests/presentation/foliageEngine.test.ts
node tools/repro-foliage-mover-uniform.mjs proof/fixture
REPRO_INIT_FILE=tools/repro-renderer-cpu-init.js node tools/repro-live-foliage-mover-uniform.mjs --url https://ael-dev3.github.io/Tervain/ --cpu true --cpu-only true --moving-cpu true --out proof/cpu
node tools/repro-live-foliage-mover-uniform.mjs --url https://ael-dev3.github.io/Tervain/ --out proof/native
```

The native probe applies the production helper to cloned live materials. It preserves the original opaque material ordering and verifies its inactive adapter against native pixels. Both modes retain the published shake cache. Shadows refresh during comparisons. The CPU probe measures traversal, callbacks, matrices and uniform submission, excludes GPU/scheduler waits and omits native raster draw-driver CPU. Its 120-pose path covers 5.157 m and 20.45 degrees. CPU collection used an optional draw-suppression preload during initial loading as well; this changes neither paired simulation nor intended draw counts and is never used for image proof.
