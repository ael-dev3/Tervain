# Skip receiver shadow taps at exactly zero intensity

Hardware pacing is still sent back; see [current status and revision](#pacing-send-back-and-base-alignment). Older whole-scene timings below are historical, not a PASS for the revised shader.

On [Pages](https://ael-dev3.github.io/Tervain/) 0.0.21 · 570a859, night-time sun shadow-map updates already pause. The sun retains its shadowed-light slot to avoid dusk/dawn shader recompilation. Its receivers still execute the PCF shadow function's texture comparisons before the final `mix(1, shadow, intensity)` discards their result at intensity zero.

The revised fix rejects **exactly zero** intensity in the existing frustum condition. It keeps the original single final return: `shadow` stays 1 and the final mix returns 1. Nonzero intensities run the original comparisons, including fractional and negative values. The earlier extra early function return has been removed. It changes no shadow-map initialization, update scheduling, light count, geometry, density, materials or visual settings.

## Deterministic comparison-tap fixture

The reusable WebGL2 fixture extracts the actual native shadow kernel, inserts the production guard verbatim for the candidate, and instruments each comparison tap with a counter. It renders lit, shaded and mixed-edge depth maps at zero, fractional, full and negative intensities, with both soft-sun and regular PCF radii and with coordinates inside/outside the map. The shadow-result byte must match in every case; nonzero intensities must retain the exact tap count. Zero-intensity calls must execute no taps.

The fixture passes all **48 before/after case pairs**. Inside-map zero-intensity calls execute **5 → 0** comparisons for regular PCF and **6 or 24 → 0** for soft-sun PCF. Shadow-result bytes match in every pair. Fractional, full and negative nonzero intensities retain their original tap counts. These are instrumented kernel comparison-call counts, not a hardware instruction-counter measurement.

## Native whole-scene verification

The replay uses the published High scene and its normal Grade/post/MSAA pipeline, inserting only the candidate production guard into newly compiled native shadow kernels. Both variants warm before balanced before/after samples. It records night forest, night meadow, daytime forest and fractional-intensity dusk meadow controls. Simulation and wind remain fixed.

GPU-query timings from software rendering describe this renderer only; they are not hardware frame cadence or an Air-class 60 fps result. Draw calls and triangles are broken down by shadow, leaf depth, leaf colour, grass and other passes. Upload bytes count source payloads; texture storage counts observed uncompressed texels/mips, not total driver VRAM.


Captures are read synchronously before awaiting timer-query completion, because the default drawing buffer can be discarded after the browser presents it. The verifier rejects blank captures.


All four native before/after images match exactly and pass the nonblank-capture check. Draws, triangles, uploads and pass breakdowns match on every measured sample. Texture count stays at 274, with observed nominal storage of 1,310,276,620 bytes (zero unknown formats).

| View | Draws | Triangles | Source upload bytes/frame | Leaf depth + colour triangles | Shadow triangles | Grass triangles |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Night forest | 194 | 3,461,239 | 20,736 | 1,439,152 | 0 | 454,665 |
| Night meadow | 101 | 1,587,857 | 0 | 309,808 | 0 | 694,764 |
| Day forest | 320 | 4,387,930 | 27,648 | 1,439,152 | 920,723 | 454,665 |
| Dusk meadow | 294 | 3,557,576 | 20,736 | 309,808 | 1,858,839 | 694,764 |

These are submission counts, not per-pass timing measurements. Substantial geometry work remains: about 1.44M leaf triangles across two passes in the forest and about 1.86M shadow triangles in the dusk meadow. This guard does not reduce those counts.

### Software GPU-query timings

Four warmed samples per variant/view, balanced in order. The night-forest median falls **4.0%** in this SwiftShader run, with nonoverlapping observed ranges. The other ranges overlap, so their timing changes are inconclusive. These seconds-long software GPU-query timings are not playable-device frame times or a 60 Hz hardware-gate result. An M5 performance gain remains unverified.

| View | Before median ms (range) | After median ms (range) |
| --- | ---: | ---: |
| Night forest | 7491.0 (7392.1–8173.8) | 7187.8 (7164.0–7284.7) |
| Night meadow | 3045.1 (3008.1–3060.7) | 2925.2 (2887.9–3136.6) |
| Day forest | 8205.6 (8125.3–8348.2) | 8152.6 (8028.0–8317.1) |
| Dusk meadow | 7186.0 (7141.7–7317.1) | 7161.7 (7106.8–7197.5) |

[Raw receipt and tap cases](proofs/zero-shadow-intensity/report.json) · [night forest before](proofs/zero-shadow-intensity/0-before.png) / [after](proofs/zero-shadow-intensity/0-after.png) · [night meadow before](proofs/zero-shadow-intensity/1-before.png) / [after](proofs/zero-shadow-intensity/1-after.png) · [day forest before](proofs/zero-shadow-intensity/2-before.png) / [after](proofs/zero-shadow-intensity/2-after.png) · [dusk meadow before](proofs/zero-shadow-intensity/3-before.png) / [after](proofs/zero-shadow-intensity/3-after.png)

```sh
node tools/repro-live-zero-shadow-intensity.mjs --url https://ael-dev3.github.io/Tervain/ --out zero-shadow-proof
npx vitest run tests/presentation/skyAtmosphere.test.ts tests/presentation/foliageEngine.test.ts --testTimeout=120000
npm run build
```

All 30 sky/foliage tests and the production build pass. Hardware play-gate verification remains pending.
## Pacing send-back and base alignment

The [hardware review](https://github.com/ael-dev3/Tervain/pull/635#issuecomment-6242067853) rejected `9791d03`: 0.4%, 4.7%, 4.4% of frames exceeded 25 ms, with one hero-jump flag; the paired live baseline was 1.3% and 1.1%. Those failures remain valid. The older software GPU queries are not a hardware pacing clearance.

The candidate now includes published `d40777b`, including the forest culling, static upload, empty-floor and faded-grass-tail optimizations missing from the rejected head. The product delta against that base is now the exact-zero term folded into the existing frustum predicate; player/camera logic matches the base. This aligns the next comparison with current live. It does not prove the pacing regression or hero-jump flag fixed.

The shader retains its baseline branch and one terminal return, avoiding the extra function exit introduced by the rejected candidate. This removes a control-flow change, but does not establish a driver/compiler cause for the hardware regression. A fresh production-kernel fixture is attached separately; earlier whole-scene captures remain historical. A new baseline-then-build hardware run, including the hero-jump check, is required before merge.

[Fresh aligned-base kernel receipt](proofs/zero-shadow-intensity/aligned-kernel.json): all 48 before/after pairs pass (96 instrumented rows). Reproduce without loading the whole world:

```sh
node tools/repro-shadow-zero-kernel.mjs shadow-zero-kernel
```
