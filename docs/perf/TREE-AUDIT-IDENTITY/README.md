# Stable tree audit identities

The published 0.0.33 build assigns decorative-tree labels by render batch/index. Low `tree:3:38` is at world X/Z (137.0056026952807, 57.60848844377324); High assigns the same label to (154.3054524618201, -74.81677297339775). Those labels cannot identify one physical tree across presets.

The candidate uses `tree:placed:<species>:<variant>:<full planting x>:<full planting z>` when there is no collision ID. Existing collision IDs remain unchanged. Root and canopy audits share this helper at every detail level. Coordinates are deliberately not rounded. This identity is stable for the same planting data; it is not a promise that arbitrary future world-layout changes preserve identity.

Run the actual-module regression and cross-preset population controls:

```
npx vitest run tests/presentation/floraPopulation.test.ts tests/presentation/pineForestIntegration.test.ts
npm run build
node tools/repro-live-tree-audit-labels.mjs --url <candidate-build-url> --out <output-directory>
node tools/play-gate.mjs --url <candidate-build-url> --budget-url https://ael-dev3.github.io/Tervain/ --head 5c78f2072
```

The integration regression fails on the original implementation: actual `tree:0:25` should identify the fir at (-60.58669644175097, -143.51154671353288). The fixed implementation passes all 26 focused tests and the production build.

The native script checks actual candidate Low/High worlds, shared-placement labels, uniqueness, and root/canopy matrices at every LOD. PNG pairs compare each frozen scene before/after read-only audit calls. They do not compare old/new foliage appearance or establish a static-clump repair. The stock budget receipt measures the current candidate head against two live probes, four distinct samples per probe; it does not establish hardware FPS or heat improvements.

No per-frame/rendering code, geometry, material, shader, physics or save data changes. Audit calls allocate longer fallback labels and invoke one helper per returned target. No per-frame CPU or GPU saving is claimed.

## Native result

All **337 shared placements** have matching labels across Low and High, with zero mismatches. High contains 451 placements; all three LODs on each preset have unique labels and matching root/canopy matrices.

| Frozen audit-call control | Before draws / triangles | After draws / triangles | Changed RGB channels | Console errors |
| --- | ---: | ---: | ---: | ---: |
| Low | 124 / 848,003 | 124 / 848,003 | 0 | 0 |
| High | 293 / 3,298,856 | 293 / 3,298,856 | 0 | 0 |

These are diagnostic-call controls at the native village camera, not the stock gate's separate budget pose. All use candidate revision `5c78f2072`. Both PNG pairs were inspected and contain the rendered scene.

[Low before](low-before.png) · [Low after](low-after.png) · [High before](high-before.png) · [High after](high-after.png) · [Full per-placement report](report.json) · [Original label collision](before.json)
