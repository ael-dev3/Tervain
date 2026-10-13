# Prune distant habitat exclusion circles

Cold grass streaming builds habitat lattice tiles. Every lattice node previously tested every soft exclusion circle, even distant ones that could not influence the point. Index each circle into the existing 8-metre spatial cells over its full `hard + 1.8` influence radius. Test only the point's bucket, retaining original circle order so attenuation multiplies in exactly the same order. No habitat formulas, placements, density, materials or shader changes.

## Production-module before/after

Baseline `0b45a36`. The counter repro uses actual Terrain, stock Exclusions (155 soft circles), and 1,920 deterministic queries around four locations: fence, inside-window, meadow and forest. These queries populate 30 cold lattice tiles.

| Measurement | Before | After |
| --- | ---: | ---: |
| Circle-distance tests | 1,343,850 | 5,066 |
| Changed cached Float32 words, 43,350 compared | — | 0 |
| Changed interpolated samples | — | 0 |
| Median cold-cache sampling CPU, seven alternating rounds | 272.3 ms | 189.5 ms |
| Median constructor CPU | 0.32 ms | 0.49 ms |

99.6% fewer circle checks; about 30% less CPU in this cold-cache workload. Timing runs use separate, uninstrumented caches and alternate order after a warmup pair; all rounds are included in the [receipt](habitat-soft-proof/cpu.json). These are anonymous sandbox CPU measurements, not Mac frame times. Counts/bytes determine repro success; timing is reported without a flaky speed threshold.

## Native grass control

A separate High grass fixture uses the production producer, actual terrain and stock exclusions. It compares SHA-256 values for all 712 attribute buffers (15,409,216 bytes), population/draw statistics and decoded RGB screenshots. All match: 28,228 instances, 65 draws and 1,624,305 submitted triangles. [Native receipt](habitat-soft-proof/pixels.json).

| Before | After |
| --- | --- |
| ![Before](habitat-soft-proof/before.png) | ![After](habitat-soft-proof/after.png) |

```sh
node tools/repro-habitat-soft-index.mjs --timings true --out habitat-soft-cpu.json
node tools/repro-habitat-soft-pixels.mjs --baseline 0b45a36 --out habitat-soft-pixels
npx vitest run tests/presentation/groundHabitat.test.ts tests/presentation/grassEngine.test.ts
npm run build
```

Both scripts load the baseline source from Git without changing the checkout. The pixel script accepts `--driver` for another CDP launcher. Twenty-one focused tests, typecheck and build pass. A full-scan oracle checks overlapping/broad circles and negative cell boundaries against the indexed fields.

## Limits

This removes a proven cold-generation cost. It does not establish that exclusion checks alone caused the tracked 32 ms bow/interior frames, guarantee a hardware frame threshold, or reduce GPU triangles/uploads. Native capture is a standalone software-WebGL colour fixture without post/MSAA or registered crown assets, not a grass-shimmer/video gate. Hardware/full-world integration still needs the normal gate.
