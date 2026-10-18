# Bound static tree uploads to changed slots

Published [Pages](https://ael-dev3.github.io/Tervain/) 0.0.20 · b204654 still uploads the complete active matrix/colour prefix whenever camera movement changes any packed tree slot. Small turns can change only a late slot while resending the unchanged instances before it.

The fix tracks the first and last changed static slot per mesh. Matrix/colour uploads use that interval; shadow-caster matrices use it too. Pending ranges from earlier refreshes are retained until Three consumes the upload, so a culled batch cannot lose queued writes. Coverage uploads, geometry, LOD selection, bounds, shaders and materials are unchanged.

## Repro and validation

The reusable replay extracts the actual baseline/candidate refresh and upload helpers, executes them on the published High forest batches, and follows each of 24 camera turn/walk steps near the fence with a native Grade/post/MSAA render. It compares active colour/caster matrices, colours, coverage, counts, bounds and selection statistics at every step, and endpoint pixels. Buffer bytes come from actual WebGL `bufferData` / `bufferSubData` arguments; uniforms and textures are outside that count.

The fully prewarmed High replay on 0.0.20 · b204654 records:

| Metric, 24 rendered steps | Before | After |
| --- | ---: | ---: |
| Actual source buffer upload bytes | 14,664 | 11,776 |
| Largest sampled frame's buffer upload bytes | 2,152 | 1,896 |
| Initial buffer allocation bytes during measurement | 0 | 0 |
| Textures | 274 | 274 |
| Changed endpoint pixels | — | 0 |

That is **19.7% fewer buffer-upload bytes in this replay**, a modest scoped saving rather than a frame-time result. Draw calls and triangles match on every step; active state hashes match across the entire route. All sampled views are warmed before either measurement, and the script rejects any measured frame with an initial buffer allocation. Texture storage is not measured here; the patch adds no textures or buffer capacity.

[Raw receipt](proofs/tree-static-upload-ranges/report.json) · [before](proofs/tree-static-upload-ranges/before.png) · [after](proofs/tree-static-upload-ranges/after.png).

The parent fails the partial-upload regression; the candidate passes it. The component regression checks uploaded ranges against the preceding buffer contents, then simulates delayed GPU consumption over several turns to catch lost pending writes. All 18 forest integration tests and the production build pass.

```sh
node tools/repro-live-tree-upload-ranges.mjs --url https://ael-dev3.github.io/Tervain/ --out tree-upload-proof
npx vitest run tests/presentation/pineForestIntegration.test.ts --testTimeout=120000
npm run build
```

Software rendering establishes work counts and matching output, not hardware frame times or an Air-class 60 fps pass. Hardware gate pending.
