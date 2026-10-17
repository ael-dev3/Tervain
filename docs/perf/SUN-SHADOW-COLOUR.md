# Compact PCF sun colour storage

Published control: **0.0.21 · 570a859**, High, [Pages](https://ael-dev3.github.io/Tervain/).

The 4096² sun target requested a 64 MiB RGBA8 colour texture alongside its 64 MiB depth texture. Three's PCF lighting samples the depth-comparison texture; three channels of the colour attachment are unused. The colour attachment is still required by the current light/target plumbing.

The sun's existing shadow-matrix callback now changes an unsigned-byte RGBA comparison target to **R8 before its first GPU allocation**. The colour texture requests **16 MiB instead of 64 MiB**, saving **48 MiB**. The depth texture, projection, filtering, comparison, bias, geometry and update cadence retain their existing values. Non-comparison, moment and floating-point colour targets retain their formats.

The callback chains through the forest's shadow-only visibility hook. Replacing a target after a quality change follows the same path. Cold-night initialization still requests its first shadow draw before pausing updates.

## Matched native render

[Machine-readable receipt](proofs/sun-shadow-colour/report.json), including every query sample, pass count and texture allocation. Both variants use the published scene and its native Grade/post/MSAA path at 640×360. The adapter forces RGBA8/R8 after the native shadow-matrix callback; allocation and warm renders precede the measured draws. Simulation, interaction accumulation and film time are frozen; full wind inputs are retained at fixed clocks 0/2/4.

| View | Draws, both | Triangles, both | Upload bytes/frame, both | Changed pixels |
| --- | ---: | ---: | ---: | ---: |
| Forest (-210, 0), noon | 436 | 6,453,188 | 32,256 | 0 |
| Meadow (-2, 38), noon | 238 | 2,487,153 | 6,912 | 0 |
| Woodland (-180, 12), dusk | 468 | 6,241,098 | 29,952 | 0 |

All three views retain 274 textures and the same pass-by-pass geometry. Observed nominal texture storage decreases **1,310,276,620 → 1,259,944,972 bytes**, exactly 48 MiB. The shadow colour allocation decreases **67,108,864 → 16,777,216 bytes**; its depth allocation remains **67,108,864 bytes**. Unknown texture formats: 0. These are requested texel/mip sizes; driver padding, compression and renderbuffers are outside the estimate.

| Timed view | Before median ms (range) | After median ms (range) |
| --- | ---: | ---: |
| Forest | 12,635.3 (12,574.8–12,683.2) | 12,759.7 (12,697.6–13,251.7) |
| Meadow | 3,880.6 (3,773.2–4,008.4) | 3,823.9 (3,776.5–3,858.1) |

Four GPU-query samples per variant, balanced before/after order. **SwiftShader draw timings show forest +1.0% and meadow −1.5%; a frame-time improvement is unproven.** The definite result is the smaller allocation. A paired hardware baseline/head play gate is required to decide the performance tradeoff. These software query times cannot establish Mac frame cadence. Dusk has one image/resource pair and is not a timing result.

| View | Before | After |
| --- | --- | --- |
| Forest | [image](proofs/sun-shadow-colour/0-before.png) | [image](proofs/sun-shadow-colour/0-after.png) |
| Meadow | [image](proofs/sun-shadow-colour/1-before.png) | [image](proofs/sun-shadow-colour/1-after.png) |
| Dusk | [image](proofs/sun-shadow-colour/2-before.png) | [image](proofs/sun-shadow-colour/2-after.png) |

## Reproduce

```sh
node tools/repro-live-sun-shadow-colour.mjs --url https://ael-dev3.github.io/Tervain/ --out sun-shadow-colour-proof
npx vitest run tests/presentation/sunShadowTarget.test.ts tests/presentation/skyAtmosphere.test.ts tests/presentation/foliageEngine.test.ts
npm run build
node tools/check-sun-shadow-startup.mjs --url "$CANDIDATE_BUILD_URL" --out sun-shadow-startup-proof
```

The render script fails on changed pixels, changed draw/triangle/upload counts, missing allocation accounting, an incorrect colour/depth size or a disjoint query. It captures the default framebuffer synchronously before yielding. The startup check runs against a compiled candidate and installs no allocation override.

[Regression receipt](proofs/sun-shadow-colour/regression.json): the original source fails 3 of the 7 new lifecycle cases; the candidate passes all 37 selected tests. Coverage includes both comparison directions, hook removal/chaining, target replacement, alternate target formats and cold-night initialization. Production build passes.

Compiled candidate **87d2da856** also passes the [cold-night startup check](proofs/sun-shadow-colour/compiled-startup.json), without allocation overrides: the first observed colour allocation is R8/16 MiB, the framebuffer is complete, the comparison texture is initialized, and night shadow updates are paused. [Compiled night capture](proofs/sun-shadow-colour/compiled-night.png).
