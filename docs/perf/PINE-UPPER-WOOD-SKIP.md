# Skip upper pine triangles in collision-footprint scans

The published pine collision-footprint scan loads all six edge endpoints of every triangle in both close wood LODs, even when a triangle is entirely above the player's clearance plane. Most upper branches cannot contribute to that footprint.

The candidate first checks the three vertex heights. Only triangles entirely above the plane are skipped. All other endpoints and crossing edges follow the original calculation and interpolation, preserving the exact radius. There are no geometry, material or placement-policy changes.

## Reproduction

```sh
node tools/repro-live-pine-upper-wood.mjs --url https://ael-dev3.github.io/Tervain/ --out pine-upper-wood-proof
npx vitest run tests/presentation/solitaryPine.test.ts --testTimeout=90000
npm run build
```

The script takes all pine LODs and retained instance transforms from the published build. It replays the native `collisionRadius` formula at every pine's actual scale and burial depth, calling the original or candidate scan helper directly. It asserts exact radii and unchanged wood/leaf geometry hashes, native full-scene post-render pixels and draw costs. Counters track full Vector3 loads and explicit height reads, including the extra early-rejection checks. Five alternating warm timing samples use separate **uninstrumented** modules.

Use `--candidate-ref c3687b571` to replay the unoptimized parent as the candidate; the work-reduction assertion must fail. The focused regression also fails against the original implementation (159,744 full vertex loads against the same 159,744-load reference). It passes with the candidate across four scales/burial depths, including crossing edges. All six pine tests, type check and production build pass.

## Receipt: published 0.0.18 · 421d34b

[Report](proofs/pine-upper-wood/report.json) · [before](proofs/pine-upper-wood/before.png) · [after](proofs/pine-upper-wood/after.png)

| Measurement | Original | Candidate |
| --- | ---: | ---: |
| Retained pine queries / shared variants | 116 / 3 | 116 / 3 |
| Full Vector3 position loads | 4,632,576 | 464,952 |
| Extra explicit height reads | 0 | 2,171,825 |
| Total position-component reads | 13,897,728 | 3,566,681 |
| Exact radial-distance evaluations | 238,639 | 238,639 |
| Uninstrumented warm helper median | 55.2 ms | 17.5 ms |

All 116 returned radii match exactly. All three LODs' wood/leaf attribute and index hashes remain unchanged. Full-scene before/after images differ in **0 channels**, with **121 draws / 824,790 triangles** in both.

Position-component reads count three accessors per full Vector3 load plus the new explicit height reads. Index accesses are not included. The timing samples include the entire scan, including the new checks; raw samples and cold instrumented timings are retained in the report. This is an isolated CPU batch, not a frame-time or whole-loading measurement.

## Limits

This covers retained pines, excluding rejected planting candidates and total world load time. Vertex-load counts are not heap allocations. Isolated helper timings are not hardware frame timings or a foliage-quality score. Hardware play-gate verification remains pending; this does not close the live16 missed-refresh reports.
