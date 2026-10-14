# Tree coverage uploads during camera movement

A forest refresh rewrote every `aDistanceCoverage` attribute and advanced its version, including unchanged `[0,1]` intervals. Camera movement and rotation trigger these refreshes immediately. The renderer consequently uploaded unchanged coverage prefixes alongside genuinely changing fades.

Compare intervals at their actual Float32 precision and mark only changed attributes. A growing instance prefix still forces an upload, even if its CPU values match: hidden tails may not have reached the GPU. Culling, geometry, distances, fade weights and shader code are unchanged.

## Reproduce

```sh
npx vitest run tests/presentation/foliageEngine.test.ts tests/presentation/distanceVisibility.test.ts --testTimeout=90000
node tools/repro-tree-coverage.mjs --baseline 5da2776 --out tree-coverage-proof
npm run build
```

The source-backed native software-WebGL fixture loads the delivered solitary-pine models and the procedural broadleaf catalog, then makes five 6 mm camera movements at High quality. It renders the original and changed forest separately. This exercises production batching code, not the complete shipped asset catalog or full game. It records actual buffer/texture source upload bytes, draw calls, triangles, coverage version changes and WebGL errors. Uniform uploads and driver overhead are excluded.

The unit regression fails on the original source because an unchanged attribute advances from version 3 to 4. With the fix, 20 foliage/distance tests pass, including unchanged coverage and hide/return prefix growth. The production build passes. No hardware frame-time reduction is claimed.

## Before/after

| Measurement | Original | Changed |
| --- | ---: | ---: |
| Warm-frame source upload bytes | 19,676 | 17,348 |
| Unnecessary coverage version changes per move | 46 | 0 |
| Draw calls per image | 62 | 62 |
| Triangles per image | 1,612,531 | 1,612,531 |
| Textures | 24 | 24 |
| Nominal texture-image payload bytes | 85,263,368 | 85,263,368 |
| Initial buffer/texture upload bytes | 69,841,706 | 69,841,706 |
| WebGL errors | 0 | 0 |

All four warm movement frames save 2,328 source bytes (11.8% of this fixture's uploads). The final images match every RGB channel. Nominal texture storage includes observed image/mip payloads, not depth/MSAA buffers or driver overhead. This modest reduction does not establish the cause of the live village hitch or eliminate the full-run upload budget.

[Machine-readable receipt](proofs/tree-coverage-upload/report.json) · [Original image](proofs/tree-coverage-upload/baseline.png) · [Changed image](proofs/tree-coverage-upload/candidate.png)
