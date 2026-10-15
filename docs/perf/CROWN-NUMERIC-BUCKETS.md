# Numeric crown-field lookup keys

`PlantedCrownIndex` constructs an `x:z` string for every ground-shade sample. Empty spatial buckets also evaluate a fresh `[]` fallback. Habitat raster generation calls this index while grass streams in; the string work repeats for each query even though the spatial coordinates are already numeric.

Use a map of numeric Z rows, each containing numeric X buckets. Queries no longer construct coordinate strings, and absent buckets return zero directly. Each bucket retains its original crown insertion order, so shade multiplication and its floating-point results remain unchanged. Separate axes impose no fixed coordinate range or packed-key collision. There is one retained map per occupied Z row, a load-time memory tradeoff for avoiding repeated query-key construction. No geometry, alpha mask, density, lighting or LOD policy changes.

## Reproduce

```sh
node tools/repro-live-crown-numeric-buckets.mjs \
  --url https://ael-dev3.github.io/Tervain/ \
  --out crown-numeric-bucket-proof
npx vitest run tests/presentation/crownQueryKeys.test.ts \
  tests/presentation/plantedCrowns.test.ts \
  tests/presentation/groundHabitat.test.ts \
  tests/presentation/grassEngine.test.ts \
  tests/presentation/forestFloor.test.ts
npm run build
```

The script freezes the published world, follows the grove camera and refreshes the full scene. It locates the native grass generator's retained Habitat through DevTools closure scopes and reads its planted index. The native compiled field is the control.

Baseline and candidate indexes execute their actual source `add()` methods using the native placements and retained crown masks. Diagnostic geometry tokens seed only the mask cache, bypassing redundant rasterization of masks already computed by the published build. No placeholder geometry is rendered. A topological order preserves every native bucket's crown order; complete bucket manifests, including transforms, mask identity and order, must match the native index. This checks index population as well as lookup.

Each arm clears Habitat's raster cache and refills the same existing tiles using the actual native grass generator. It compares all five raster channels, active base/shape/tint/slope buffers, instance counts and bounds, then compares full-scene post-processing pixels. The native refill must first reproduce the untouched published tile buffers. Source instrumentation counts shade-query entries, coordinate-string expressions and empty fallback-array expressions during generation. Separate controlled empty-cell queries verify the absent-bucket path; their counts are kept apart from natural tile-generation counts. The full source hash and passing report accompany matched screenshots under `proofs/crown-numeric-buckets/`.

## Receipt: published 0.0.18 · 421d34b

The native index retains 253 crown entries and 18 masks in this fixture. All rebuilt bucket manifests match it exactly, including crown order. Generating **31 grass tiles / 4,088 instances / 22 habitat rasters** makes **12,716 shade queries** in both arms. Coordinate-string expressions fall **12,716 → 0**.

Natural tile generation hits no absent buckets: its fallback-array count is **0 → 0**, not a measured allocation saving. The two separate controlled empty-cell probes retain zero shade and reduce both coordinate-string and fallback-array expressions **2 → 0**.

All generated buffers and bounds match the native control (`20d09afa…dc161aa`), as do all raster channels (`6ab48c31…be8199f`). Native/before/after images are pixel-identical. Draw calls **245**, triangles **1,889,302**, and texture count **174** remain unchanged. The report records the passing assertions and tested source hash.

The production build and 41 focused tests pass. The new regression fails on the baseline (80 string-key lookups) and passes with none; signed/distant cells and broadleaf filtering retain their expected shade.

## Limits

Counts describe source operations, not measured heap allocations, GC pauses or hardware frame times. This does not prove the historical village-pan hitch is resolved or that a particular device meets 60 fps. The fixture exercises native grass streaming; it does not assign a natural play frequency to every query. Native masks are retained, so this is not a mask-rasterization benchmark. A hardware play-gate receipt remains outstanding. Failed assertions return a nonzero status and each run deletes its previous report before starting.
