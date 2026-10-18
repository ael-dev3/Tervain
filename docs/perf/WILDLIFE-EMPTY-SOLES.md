# Empty-sole wildlife hierarchy refresh

Live 0.0.28 (`30d1f0d`) has 19 wildlife rigs with no retained sole samples. Placement refreshes each hierarchy twice despite making no intervening height correction. The candidate returns after the first hierarchy refresh and palette update when the sole list is empty. Grounded rigs retain both refreshes.

| Work per wildlife update | Before | After |
| --- | ---: | ---: |
| Root hierarchy refreshes | 38 | 19 |
| Matrix compositions | 1,235 | 627 |
| Matrix multiplications | 1,767 | 1,159 |
| Skin palette updates | 19 | 19 |
| Sole vertex samples | 0 | 0 |
| Module thread CPU average, ms | 0.2056 | 0.1537 |
| Module thread CPU p95, ms | 0.260 | 0.189 |

CPU: 120 balanced pairs after 60 warm pairs, Chrome thread time for posed wildlife `update(0)`, with arithmetic counters removed before timing. This is module CPU evidence, not whole-game frame time or Apple GPU/thermal evidence.

Six native High 640×360 full-pipeline post/MSAA4 pairs have identical RGBA bytes and GPU-precision world/bone palettes. The five forest poses advance animation; the sixth is a deer close view. All six pose hashes differ from each other. Palette updates stay in their original position. No raster suppression. The native adapter explicitly skips only the second refresh for the observed empty-sole cohort; production wiring has separate regression tests.

| Pose | Draws before/after | Triangles before/after | Changed RGBA bytes |
| --- | ---: | ---: | ---: |
| 0 | 399 / 399 | 6,780,812 / 6,780,812 | 0 |
| 1 | 402 / 402 | 6,813,892 / 6,813,892 | 0 |
| 2 | 403 / 403 | 6,858,001 / 6,858,001 | 0 |
| 3 | 404 / 404 | 6,872,757 / 6,872,757 | 0 |
| 4 | 403 / 403 | 6,872,373 / 6,872,373 | 0 |
| 5 | 243 / 243 | 2,696,991 / 2,696,991 | 0 |

No shader, texture, geometry or material changes. Runtime errors: zero. The compiled candidate `d6157fd` passed the native software-WebGL smoke check (321 draws, 3,507,164 triangles in its separate stationary fixture). That smoke check is not a hardware performance gate. Four relevant test files pass, 47 tests; type-check and production build pass. The regression fails against the original empty-sole path and preserves the nonempty-sole path.

[Raw paired report](proofs/wildlife-empty-soles/report.json), [compiled smoke](proofs/wildlife-empty-soles/compiled-smoke.json), and twelve PNGs in the same directory. [Repro driver](../../tools/repro-empty-soles-live.mjs): run with an output directory while published revision is `30d1f0d`; it rejects revision drift and non-native raster capture.
