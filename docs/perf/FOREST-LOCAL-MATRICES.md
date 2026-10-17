# Fixed tree color-batch local matrices

In the [published build](https://ael-dev3.github.io/Tervain/), tree placement is written into each batch's instance matrices. The wood and foliage color batches themselves keep a fixed identity local transform, but still recompose it on every scene matrix walk, including hidden detail levels.

The change initializes each color batch's local matrix once and disables its local auto-update. World auto-updates remain enabled so moving a parent still propagates correctly. Instance packing, detail selection, geometry, materials, wind and shadows are unchanged. This patch only addresses wood/foliage color batches.

## Matched result

Published 0.0.18 (`421d34b`) contains 117 retained wood/foliage color batches. Across 120 forced scene matrix walks, their local compositions fall **14,040 → 0**. Every local/world matrix and rendered pixel matches exactly. Draws stay at 121 calls / 824,790 triangles with 102 textures. All 17 forest integration tests pass with the CI timeout, and the production build passes.

## Reproduce

```sh
node tools/repro-live-forest-local-matrices.mjs --out forest-local-matrix-proof
npx vitest run tests/presentation/pineForestIntegration.test.ts --testTimeout=90000
npm run build
```

The script discovers actual native wood/foliage color batches at all detail levels, applies the exact baseline/candidate local initialization policy to them, and counts actual `Matrix4.compose` calls over 120 forced scene matrix walks. It compares every retained local/world matrix and full native endpoint pixels, draw calls and triangles. The complete builder is exercised separately by integration tests, including parent movement with rotation/nonuniform scale and unchanged instance buffers.

Use the repository CI’s 90-second per-test budget; two existing build-heavy cases exceed the default five-second local limit. The unchanged-source control must fail the reduction assertion. The new integration regression fails on the original code (17,880 local compositions in its fixture).

[Receipt, matched screenshots and unchanged-source control](../../proofs/forest-local-matrices).

This is software-WebGL verification of redundant CPU work, not 120 rendered gameplay frames, an Apple GPU measurement, or proof that any specific missed refresh is resolved.
