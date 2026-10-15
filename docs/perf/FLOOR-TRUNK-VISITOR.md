# Forest-floor trunk exclusion without collected lists

The [published build](https://ael-dev3.github.io/Tervain/) builds a temporary list of nearby trees before each forest-floor trunk test. The predicate only needs to know whether one trunk is too close, but collection visits every neighboring bucket first.

The change scans those buckets directly in the same order and returns at the first blocking trunk. It keeps the exact distance expression and separate log/plant clearance margins. Source-free authoring fixtures retain their original canopy approximation. No placement rules, geometry or materials change.

## Matched result

Published 0.0.18 (`421d34b`), using 453 retained canonical trees: nearby-list constructions fall **967 → 0**. All 545 piece records and all Low/Medium/High selections (**197 / 365 / 545**) match exactly. The loaded world also reports 197 selected floor pieces at Low. Eighteen floor/canopy tests and the production build pass.

## Reproduce

```sh
node tools/repro-live-floor-trunk-visitor.mjs --out floor-trunk-proof
npx vitest run tests/presentation/forestFloor.test.ts tests/presentation/plantedCrowns.test.ts --testTimeout=90000
npm run build
```

The script retrieves the published forest initializer's retained canonical tree population, exclusion object and planted crown field, then runs the actual baseline and candidate population builders against that world's terrain. It compares every generated piece property and all three quality selections, and checks that the Low selection count agrees with the loaded world's floor. The unchanged-source control must fail the reduction assertion.

[Matched receipt and unchanged-source control](../../proofs/floor-trunk-visitor).

This is a load-time population-builder replay, not a rendered route or per-frame measurement. Counts describe executed temporary-list construction sites, not measured heap allocation or GC. No hardware frame-time improvement or resolved village-pan/mud hitch is claimed. The change preserves complete placement data; it does not substitute the rendered world or change its appearance.
