# Avoid norms in crown-mask edge coverage

Projected canopy-mask rasterization tests whether each grid cell lies inside a leaf triangle or within half a raster cell of one of its edges. Each edge test computed a full `Math.hypot` norm. Test squared distance against squared radius for clear cases; retain the original norm when squaring is non-finite/subnormal or rounding could cross the boundary. The three edge predicates also short-circuit once retention is established. Triangle order, padding, mask filtering and resulting coverage remain unchanged.

## Reproduce

```sh
node tools/repro-live-crown-mask-edges.mjs \
  --url https://ael-dev3.github.io/Tervain/ \
  --out crown-mask-edge-proof
npx vitest run tests/presentation/projectedEdgeWithin.test.ts \
  tests/presentation/plantedCrowns.test.ts \
  tests/presentation/groundHabitat.test.ts \
  tests/presentation/grassEngine.test.ts \
  tests/presentation/forestFloor.test.ts
npm run build
```

The script uses the published world's near-LOD foliage geometries. Every retained native canopy mask must be covered by that geometry corpus; missing coverage fails the run. The baseline and candidate execute actual index construction and rasterize the real geometries without seeding their caches. Instrumentation counts projected-edge tests and `Math.hypot` calls, not time. The new numerical tests compare the original norm predicate at endpoints, degenerate edges, underflow/overflow inputs and 14,000 probes around 2,000 deterministic radius boundaries. A topological insertion order preserves all native per-bucket multiplication orders; complete mask data and ordered bucket manifests must match the native field.

It then clears the actual Habitat raster cache and refills the same native grass tiles through the actual generator. Native/baseline/candidate raster channels, active attribute buffers, instance counts, bounds and final post-processing pixels must match. The native refill must first reproduce the untouched published tile data.

## Receipt: published 0.0.18 · 421d34b

The real near-LOD geometry corpus covers all **18 retained canopy masks / 253 crown entries**. Rebuilding them reduces `Math.hypot` calls **535,596 → 18**; the remaining 18 calls compute per-mask padding. Edge-predicate entries fall **535,578 → 527,235** through short-circuiting. These are cold construction counts, not per-frame counts or timings.

Every complete mask and ordered bucket manifest matches the compiled native field. All five Habitat raster channels match (`6ab48c31…be8199f`), as do the native grass buffers and bounds (`20d09afa…dc161aa`): **31 tiles / 4,088 instances / 22 rasters**. Native/before/after images are pixel-identical; **245 draw calls / 1,889,302 triangles / 174 textures** remain unchanged. The committed report includes passing assertions and the tested source hash.

The production build and 42 focused tests pass, including endpoint, degenerate and extreme-input checks and 14,000 comparisons around rounding-sensitive radius boundaries.

## Limits

This removes mask-construction work, not per-frame shader or draw work. It does not establish hardware load times, GC savings, Mac frame rates or resolution of historical stalls. These are projected geometric shade masks, not an alpha-aware detached-leaf audit. A hardware play-gate receipt remains outstanding. Failed assertions return a nonzero exit status and each new run removes its previous report first.
