# Reuse known forest-floor canopy samples

The [published build](https://ael-dev3.github.io/Tervain/) samples canopy shade at a fern colony's center before selecting its plants, then samples that same point again when placing the central fern. Litter selection also reads its shade before placement repeats the lookup.

Pass these known values into the private placement helper. Other pieces continue to query their own positions. The planted crown field is fixed during this synchronous population build. Broadleaf lookup order, random-number consumption, clearance rules and all placement data stay unchanged; no additional cache is retained.

## Matched result

Published 0.0.18 (`421d34b`), with 453 retained canonical trees:

- Canopy queries **3,932 → 3,267**: **665 fewer (16.9%)**.
- Broadleaf queries unchanged at **369**.
- All **545** piece records and all Low/Medium/High selections (**197 / 365 / 545**) match exactly.
- Baseline and candidate floor rebuilds both match the original native scene's final pixels exactly.
- Draws unchanged at **245 / 1,889,302 triangles**.
- Unchanged-source control correctly fails the reduction assertion.
- Eighteen floor/canopy tests and the production build pass.

## Reproduce

```sh
node tools/repro-live-floor-canopy-reuse.mjs --out floor-canopy-proof
npx vitest run tests/presentation/forestFloor.test.ts tests/presentation/plantedCrowns.test.ts --testTimeout=90000
npm run build
```

The script retrieves the published forest initializer's retained tree population, exclusions and planted crown field. It runs the actual baseline/candidate population builders against the native terrain and counts calls through that retained crown field. It compares every piece property and every quality selection, then rebuilds each floor module in the native scene and checks its post/MSAA pixels against the original floor. Other scene modules stay native. Counts describe one population build; the separate render setup is outside those counts. Render verification uses Low quality; placement selections are checked at all qualities.

[Receipt, matched screenshots and unchanged-source control](../../proofs/floor-canopy-reuse).

This is load-time CPU work reduction, not a measured hardware frame-time improvement or proof that a particular hitch is fixed. Geometry, shading and placement remain unchanged.
