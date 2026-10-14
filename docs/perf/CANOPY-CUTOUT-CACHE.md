# Keep canopy alpha variants independent

The canopy audit cached leaf components by wood and leaf geometry alone. Two targets sharing those buffers but using different alpha maps, UV channels or cutoffs therefore inherited whichever cutout was processed first. That could hide a detached opaque island, or falsely flag a supported crown when input order reversed.

Partition the cache by cutout sampler identity in alpha mode. Non-alpha mode still shares its geometry-only entry. Branch-triangle acceleration remains shared. Production tree geometry and materials are unchanged.

## Native before/after repro

[Receipt](proofs/canopy-cutout-cache/report.json) · [software-WebGL fixture image](proofs/canopy-cutout-cache/fixture.png)

The fixture uses the same wood/card geometry for two targets, with a fully opaque material and a narrow alpha-cutout material. Single-target audits establish supported=0 islands, masked=1 island.

| Input order | Before: supported / masked | After |
| --- | --- | --- |
| supported first | 0 / 0 (masked island missed) | 0 / 1 |
| masked first | 1 / 1 (supported crown falsely flagged) | 0 / 1 |

The actual baseline and current production functions run inside the native browser fixture. Four draws / 32 triangles render with no GL error or lost context. The image is one unchanged diagnostic view, not a before/after art change. No claim is made that a particular live tree currently uses differing cutouts on shared geometry.

```sh
node tools/repro-canopy-cutout-cache.mjs --baseline 421d34b --out canopy-cutout-proof
npx vitest run tests/presentation/canopyAudit.test.ts tests/presentation/canopyBaseline.test.ts
npm run build
```

Both order regressions fail on the published baseline; all 25 selected tests and the production build pass after. Distinct cutouts now require their own component/contact work, correctly charged to the existing audit budget. This improves measurement correctness; it does not establish live forest quality or fix the night hitch.
