# Skip receiver shadow taps at exactly zero intensity

On [Pages](https://ael-dev3.github.io/Tervain/) 0.0.21 · 570a859, night-time sun shadow-map updates already pause. The sun retains its shadowed-light slot to avoid dusk/dawn shader recompilation. Its receivers still execute the PCF shadow function's texture comparisons before the final `mix(1, shadow, intensity)` discards their result at intensity zero.

The fix returns 1 immediately at **exactly zero** intensity. Nonzero intensities run the original code, including fractional and negative values. It changes no shadow-map initialization, update scheduling, light count, geometry, density, materials or visual settings.

## Deterministic comparison-tap fixture

The reusable WebGL2 fixture extracts the actual native shadow kernel, inserts the production guard verbatim for the candidate, and instruments each comparison tap with a counter. It renders lit, shaded and mixed-edge depth maps at zero, fractional, full and negative intensities, with both soft-sun and regular PCF radii and with coordinates inside/outside the map. The shadow-result byte must match in every case; nonzero intensities must retain the exact tap count. Zero-intensity calls must execute no taps.

The fixture passes all **48 before/after case pairs**. Inside-map zero-intensity calls execute **5 → 0** comparisons for regular PCF and **6 or 24 → 0** for soft-sun PCF. Shadow-result bytes match in every pair. Fractional, full and negative nonzero intensities retain their original tap counts. These are instrumented kernel comparison-call counts, not a hardware instruction-counter measurement.

## Native whole-scene verification

The replay uses the published High scene and its normal Grade/post/MSAA pipeline, inserting only the candidate production guard into newly compiled native shadow kernels. Both variants warm before balanced before/after samples. It records night forest, night meadow, daytime forest and fractional-intensity dusk meadow controls. Simulation and wind remain fixed.

GPU-query timings from software rendering describe this renderer only; they are not hardware frame cadence or an Air-class 60 fps result. Draw calls and triangles are broken down by shadow, leaf depth, leaf colour, grass and other passes. Upload bytes count source payloads; texture storage counts observed uncompressed texels/mips, not total driver VRAM.


Captures are read synchronously before awaiting timer-query completion, because the default drawing buffer can be discarded after the browser presents it. The verifier rejects blank captures.

```sh
node tools/repro-live-zero-shadow-intensity.mjs --url https://ael-dev3.github.io/Tervain/ --out zero-shadow-proof
npx vitest run tests/presentation/skyAtmosphere.test.ts tests/presentation/foliageEngine.test.ts --testTimeout=120000
npm run build
```

All 30 sky/foliage tests and the production build pass. Hardware play-gate verification remains pending.
