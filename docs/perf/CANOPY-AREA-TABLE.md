# Reuse leaf-area distributions during canopy spacing retries

The source leaf geometry stays fixed while the canopy builder relaxes its minimum clump spacing. Each sampling round nevertheless rescans every source triangle, recomputes the same cumulative areas and allocates another `Float64Array`.

Build that distribution lazily once inside each canopy build and reuse it for subsequent rounds. The sampler keeps its existing binary search, interpolation arithmetic and random calls. The table does not survive the build; geometry changes and later builds get a fresh distribution.

## Reproduction

```sh
node tools/repro-live-canopy-area-table.mjs --out canopy-area-table-proof
npx vitest run tests/presentation/canopy.test.ts tests/presentation/meshyTrees.test.ts --testTimeout=90000
npm run build
```

The replay defaults to the [published build](https://ael-dev3.github.io/Tervain/). It obtains that build's immutable parsed tree templates and reconstructs all 17 native asset-backed variants / 51 LODs through the parent and candidate factories. It counts area-table constructions and triangle-area evaluations, then compares every geometry attribute, index and twig-plan hash. A reconstructed leaf template whose complete buffers match the published geometry is rendered at its native placement with its native material hooks through software WebGL and the postprocessed render path. Hiding that leaf is an independent visible-geometry control.

`--candidate-ref 263102c4c` selects unchanged parent source and must fail the reduction assertion. The unchanged-source baseline recorded before implementing the change reports 115 → 115 tables, 642,135 → 642,135 triangle-area evaluations, unchanged images and exit 1. The focused unit regression also fails against the parent: two builds create ten tables instead of two.

## Receipt: published 0.0.18 · 421d34b

[Report](proofs/canopy-area-table/report.json) · [before](proofs/canopy-area-table/before.png) · [after](proofs/canopy-area-table/after.png) · [hidden-leaf control](proofs/canopy-area-table/empty.png) · [unchanged-source baseline](proofs/canopy-area-table/unchanged-source.json)

| Measurement | Parent | Candidate |
| --- | ---: | ---: |
| Area-table constructions | 115 | 27 |
| Triangle-area evaluations | 642,135 | 146,220 |
| Cumulative table-array payload | 5,137,080 bytes | 1,169,760 bytes |
| Draw calls | 246 | 246 |
| Triangles | 1,429,494 | 1,429,494 |

All attributes, indices and twig plans match across all 51 LODs. The rendered leaf fixture changes 0 image channels; hiding it changes 620,892 channels. The array-payload reduction is 3,967,320 bytes cumulatively across construction, not a peak-memory measurement.

## Limits

This cuts redundant foliage construction work. It does not change canopy shape, connectivity, materials, LOD policy or triangle count, and does not close the remaining tree-quality reports. Cumulative table payload is not peak heap or measured GC savings. Construction timings in the JSON are diagnostic; they do not establish full-load or frame-time improvement. Hardware play-gate verification remains pending.

20 tests pass across canopy and native-tree suites. Type-check and production build pass.
