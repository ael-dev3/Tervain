# Retain immutable falling-leaf flight factors

Published build: [Pages](https://ael-dev3.github.io/Tervain/), **0.0.18 · 421d34b**. Related [playtest checklist #326](https://github.com/ael-dev3/Tervain/issues/326).

Every falling-leaf position evaluates cosine/sine of its fixed drift angle and two fixed flutter offsets. These four values never change over a stream's lifetime, but were recalculated during the landing search and on every pose update. Store four scalars when constructing each stream. Keep the age-dependent sine terms, seeded random draw order, phase, contact search and all render/update rules unchanged.

## Matched native-input replay

The complete baseline module matches published source. Rebuild both modules using the live world's selected trees, variants and terrain, with a controlled wind angle of zero. All 77 release origins match the actual native streams. Construction metadata—including contact position/time, cycle, seed-derived parameters and terrain ceiling—matches exactly between baseline and candidate.

| Constant-angle trig expression evaluations, 77 streams | Baseline | Candidate |
| --- | ---: | ---: |
| Construction and contact search | 15,092 | 308 |
| Initial zero-delta pose plus 120 updates | 37,268 | 0 |

This counts the four invariant expressions only. Dynamic-angle trig remains. It is not a count of machine instructions or a measured CPU-time reduction.

All 120 recorded complete instance-matrix and opacity buffer pairs match. The run includes camera panning, distance exit/re-entry and ten reduced-motion updates. Four post-processing/MSAA image pairs match pixel-for-pixel; hiding the leaves changes **222, 259, 330 and 507 channels**, checking that the effect really contributes visible pixels.

| Captured update | Draw calls, both | Triangles, both | Textures, both |
| --- | ---: | ---: | ---: |
| 0 | 56 | 158,841 | 94 |
| 30 | 58 | 175,225 | 94 |
| 60 | 61 | 192,115 | 94 |
| 119 | 58 | 175,225 | 94 |

The dynamic matrix-plus-opacity source payload is **5,236 bytes** in both variants. That is buffer capacity, not a measurement of per-frame upload traffic or texture-memory bytes. This change adds four cached CPU scalars per stream; heap size and GPU frame time were not measured.

[Full hashes/counts](proofs/leaf-flight-constants/report.json). Representative first/last captures:

- Update 0: [before](proofs/leaf-flight-constants/before-0.png), [after](proofs/leaf-flight-constants/after-0.png), [hidden-leaf control](proofs/leaf-flight-constants/empty-0.png).
- Update 119: [before](proofs/leaf-flight-constants/before-119.png), [after](proofs/leaf-flight-constants/after-119.png), [hidden-leaf control](proofs/leaf-flight-constants/empty-119.png).

## Reproduce

```sh
node tools/repro-live-leaf-flight-constants.mjs --out leaf-flight-constants-proof
# Expected failure: unchanged source cannot satisfy the reduction assertions.
node tools/repro-live-leaf-flight-constants.mjs --candidate-ref 4b218895d --out leaf-flight-constants-control
npx vitest run tests/presentation/fallingLeaves.test.ts tests/presentation/foliageEngine.test.ts --testTimeout=90000
npm run build
```

The script writes all four before/after/control image triplets; the receipt contains all four comparisons and every update's full-buffer hashes. The first camera attempt aimed at an occluded leaf and failed the nonempty-image assertion. The passing fixture chooses a seeded leaf in mid-flight and requires every hidden-leaf control to change pixels. Separate Three-module IDs are advanced beyond native scene IDs before adding fixture objects, avoiding renderer cache collisions.

Sandbox captures used a temporary verified-HTTPS mirror because Chrome did not trust the sandbox's HTTPS proxy certificate. Models were verified against the published revision's size/SHA-256 table, and the game's own integrity checks remained active. No TLS or checksum checks were disabled. The script defaults to Pages for normally trusted Chrome environments.

The [unchanged-source control](proofs/leaf-flight-constants/unchanged-source.json) retains 15,092 construction and 37,268 runtime evaluations on both sides and correctly fails the reduction assertions.

28 existing falling-leaf/foliage tests and production type-check/build pass, including drift-direction, release-source, terrain-contact, range and reduced-motion behavior. No shader, leaf geometry, density, palette or animation rule changes. This is a complete source-module replay using native inputs at controlled time/wind, not a natural play trace or a whole candidate build walkthrough. Hardware play-gate remains required; no Mac FPS, heat, shimmer or missed-refresh fix is claimed.
