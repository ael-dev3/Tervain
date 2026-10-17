# Retain leaf-sampling map state within a batch

Published evidence: [Pages](https://ael-dev3.github.io/Tervain/), **0.0.18 · 421d34b**. Related checklist: [#326](https://github.com/ael-dev3/Tervain/issues/326).

The leaf release-site sampler re-fetches an unchanged UV attribute and creates an alpha-channel reader callback for each candidate triangle. Retain both with the map's existing batch state. Each synchronous sampling call still reads current geometry, UV channel, texture, pixels and transform; no state survives into another call.

This PR is stacked on #615. Its parent sampler derives from the published sampler with that PR's UV scratch reuse. The replay verifies the earlier sampler functions against published source, then independently compares both candidates with actual native cached release sites.

| Ten native shedding-tree templates | Parent | Candidate |
| --- | ---: | ---: |
| Geometry attribute lookups | 5,013 | 20 |
| Alpha-reader callback evaluations | 4,993 | 10 |
| Release sites | 3,584 | 3,584 |
| Actual native stream origins matched | 77 | 77 |

Every release coordinate and iteration order matches exactly. Site hashes and stream-to-surface distances are in [the receipt](proofs/leaf-site-map-state/report.json). This is a source-preparation cost reduction, not a fix for visible canopy islands, grass sparkle or pop-in. Exact unchanged release coordinates are the output contract; no shader, geometry, material or draw behaviour changes.

## Reproduce

```sh
node tools/repro-live-leaf-site-map-state.mjs --out leaf-site-map-state-proof
# Negative control: unchanged source must fail the operation-reduction assertions.
node tools/repro-live-leaf-site-map-state.mjs --candidate-ref 8552b6d89 --out leaf-site-map-state-control
npx vitest run tests/presentation/leafSurfaceSites.test.ts tests/presentation/leafIslands.test.ts tests/presentation/canopy.test.ts tests/presentation/farLeafContact.test.ts --testTimeout=90000
npm run build
```

The software-WebGL replay loads published assets, instruments only attribute lookups and callback-expression evaluations, then uses separate uninstrumented modules for timing. Ten oak/birch/orchard near templates are selected because those species supply native falling-leaf streams; this is not a whole-forest or all-LOD quality audit. Hashes encode JSON xyz objects in source order. `--candidate-ref` changes only the candidate module, retaining the same native corpus and assertions.

[The unchanged-source control](proofs/leaf-site-map-state/unchanged-source.json) retains 5,013 lookups and 4,993 callbacks on both sides and fails the reduction assertion as expected.

33 focused tests and production type-check/build pass. A replacement-UV-attribute test verifies fresh state between calls; existing tests cover independent alpha-map UV channels and texture changes.

Timing is **inconclusive**: five alternating warm samples (each 20 corpus passes after 20 warm-ups) overlap: parent 19.3–42.4 ms, candidate 18.5–41.8 ms, medians 24.1/26.8 ms. Do not interpret callback-expression evaluations as measured heap allocations or GC savings. No startup, frame-time or Mac hardware FPS improvement is established. Hardware play-gate review remains required; the separate `live16` missed-refresh leads remain open.
