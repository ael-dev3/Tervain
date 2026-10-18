# Unchanged single-shadow matrix submissions

Three's directional shadow matrix is normally an array, even for a single shadow. Its array setter flattens and uploads that matrix again on every material submission. Foliage receives the same sun-shadow matrix across many draws.

For exactly one directional shadow, expose the same matrix as a scalar `mat4` so Three's existing single-matrix setter caches its sixteen elements. The shadow-coordinate multiplication and GPU values are unchanged. Zero and multiple directional shadows retain the array path. Renderer assignments reach the original uniform record; changing an existing matrix in place still uploads its new values.

The change is restricted to physical foliage materials and their leaf-depth clones. Other lit materials retain their existing uniforms. It adds no draw, geometry, texture, texture fetch or matrix multiplication. Three retains sixteen cached numbers per affected active program. It does not allocate a matrix or array per frame.

## Verification

The [compiled fixture](proofs/single-shadow-matrix/fixture.json) exercises zero, one and two directional shadows over five frames each. Every before/after RGB channel and draw/triangle count matches. Static single-shadow uploads fall from two calls / 128 API bytes to zero; moving the light causes one new call / 64 bytes. Zero/two-shadow calls and bytes are unchanged. This also checks the actual active GL uniform name and shape.

All 30 selected tests pass, including production standard/physical foliage hooks and leaf-depth twins. The regression tests use Three's actual WebGLUniforms setters, including in-place mutation and replacement matrices. Unsupported shader hooks remain untouched. The production source revision used for the build is `5c10edcc248737729c7b9fc4ae0c16a988667502`.

## Five native forest poses

[Complete native receipt](proofs/single-shadow-matrix/native.json). Every pair and restored baseline has identical RGB, with zero console/GL errors. All captures use the published High world and native post/MSAA4 rendering. No geometry or textures are replaced.

| Pose | Draws, both modes | Triangles, both modes | Changed RGB channels |
| --- | ---: | ---: | ---: |
| [1 before](proofs/single-shadow-matrix/before-0.png) / [after](proofs/single-shadow-matrix/after-0.png) | 280 | 5,224,983 | 0 |
| [2 before](proofs/single-shadow-matrix/before-1.png) / [after](proofs/single-shadow-matrix/after-1.png) | 283 | 5,258,063 | 0 |
| [3 before](proofs/single-shadow-matrix/before-2.png) / [after](proofs/single-shadow-matrix/after-2.png) | 284 | 5,301,668 | 0 |
| [4 before](proofs/single-shadow-matrix/before-3.png) / [after](proofs/single-shadow-matrix/after-3.png) | 285 | 5,316,424 | 0 |
| [5 before](proofs/single-shadow-matrix/before-4.png) / [after](proofs/single-shadow-matrix/after-4.png) | 284 | 5,316,040 | 0 |

This is unchanged-output proof for five stepped walk/turn and wind poses, not a closure claim for foliage shimmer or a measured display cadence.

## High forest CPU and submission budget

Published baseline: **0.0.23 · e3b81ca**, confirmed in both the menu and version endpoint. High, 640×360, native post/MSAA4, default tree detail. The CPU replay fixes the view near (-210, 0), primes both material modes, stops the app's animation-frame callback, and explicitly sets render delta time to zero. Sixty warm pairs precede 120 measured pairs with alternating A/B order. The original program sort order is retained.

| Per replay frame | Live material → cached material | Delta |
| --- | ---: | ---: |
| Directional-shadow matrix uploads | 115 → 61 calls | −54 (−47%) |
| Directional-shadow matrix API payload | 7,360 → 3,904 bytes | −3,456 bytes (−47%) |
| Renderer thread CPU, average | 3.334 → 3.196 ms | −0.138 ms (−4.1%) |
| Renderer thread CPU, p95 | 5.087 → 4.851 ms | −0.236 ms (−4.6%) |
| Maximum intended draws, shadows enabled | 376 → 376 | 0 |
| Maximum intended triangles, shadows enabled | 6,413,125 → 6,413,125 | 0 |
| Texture count | 274 → 274 | 0 |
| Texture taps / matrix multiplications / uniform GPU words | Unchanged | 0 |
| Console/GL errors | 0 → 0 | 0 |

[All paired CPU samples](proofs/single-shadow-matrix/cpu.json). These are route-specific live/candidate-overlay counts, not the standard play-gate route's absolute maxima. The 61 remaining shadow uploads include other materials; this patch does not claim to remove every shadow matrix submission.

Earlier attempts let the animation-frame callback advance `lastFrameDt` between manual renders. Their changing auxiliary passes and CPU samples are excluded. The completed receipt uses the corrected frozen controller. The measured saving is renderer submission CPU in this software backend, not a hardware frame-pacing claim.

## Moving forest replay: CPU result is mixed

The additional [moving receipt](proofs/single-shadow-matrix/cpu-walk.json) follows the same forest route for 120 paired poses: 5.157 m walked and 20.45° turned, with wind time advanced at the synthetic 60 Hz source cadence. The whole route is warmed first. Shadow maps update normally. World/camera preparation runs once per pair outside the renderer CPU timestamps; simulation cost is not included.

| Per moving replay frame | Live → cached | Delta |
| --- | ---: | ---: |
| Shadow-matrix uploads, average | 116.95 → 75.25 | −41.70 calls (−35.7%) |
| Shadow-matrix API bytes, average | 7,484.8 → 4,816.0 | −2,668.8 bytes |
| Renderer thread CPU, average | 3.014 → 3.069 ms | **+0.055 ms** |
| Renderer thread CPU, p95 | 4.581 → 5.161 ms | **+0.580 ms** |
| Maximum intended draws | 423 → 423 | 0 |
| Maximum intended triangles | 8,005,237 → 8,005,237 | 0 |
| Console errors | 0 → 0 | 0 |

The matrix-submission reduction is real, but these samples do **not** establish non-increasing CPU during movement. Do not call this a moving CPU or frame-pacing PASS. Stationary and moving measurements are both retained; the candidate needs review against the CPU requirement before landing. No hardware or whole-game frame-time improvement is claimed.

## Reproduce

```sh
npx vitest run tests/presentation/singleShadowMatrix.test.ts tests/presentation/foliageEngine.test.ts tests/presentation/treeBarkDetail.test.ts
npm run build
node tools/repro-single-shadow-matrix.mjs shadow-fixture-proof
node tools/repro-live-single-shadow-matrix.mjs --url https://ael-dev3.github.io/Tervain/ --head "$LIVE_REVISION" --cpu true --out shadow-forest-proof
node tools/repro-live-single-shadow-matrix.mjs --url https://ael-dev3.github.io/Tervain/ --head "$LIVE_REVISION" --cpu true --cpu-only true --moving-cpu true --out shadow-walk-proof
```

The live probe applies the exact production helper to cloned native foliage materials and preserves the original opaque sort order. It first checks that the inactive adapter matches native RGB. It then checks five High forest poses through the native post/MSAA path, with a restored baseline control and exact per-pose draw/triangle equality. Shadows are primed at each pose and frozen only for those image comparisons.

The separate CPU collection keeps shadow updates enabled, warms both modes, and alternates their order for 120 paired samples. It uses Chrome thread CPU clocks around the renderer (including the common counter/sort instrumentation), excluding scheduling and GPU waits. Raster draw entry points are suppressed only in that CPU collection; traversal, matrix updates, callbacks and uniform submission still run. Native draw-driver CPU and the game's simulation/input step are omitted. This measures renderer submission CPU per replay frame, not complete game-frame duration, Mac FPS, thermals or hardware GPU time. Upload bytes are GL command payload, not measured bus traffic. The deterministic hardware gate remains a separate check.
