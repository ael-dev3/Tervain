# Retained static-source local transforms

The published 0.0.18 build (`421d34b`) retains hidden original prop meshes after `mergeStaticParts` builds replacement batches. These fixed source meshes still compose their local matrices on every scene matrix walk. This is unnecessary CPU work in the village; it does not establish the cause of any particular missed refresh.

Only successfully merged parts now disable `matrixAutoUpdate`. Their local matrices were already populated before merging. World-matrix updates remain enabled, so parent transforms still propagate to retained lookup/picking objects. Skipped and unmerged meshes keep their original behavior. The documented contract already requires merged source parts to stay fixed.

## Matched result

Across 85 retained source meshes in nine native batches, 120 matrix walks perform **10,200 → 0 local compositions**. All local/world matrix hashes and pixels match exactly. Both variants draw 121 calls / 824,790 triangles with 102 textures. Four focused tests and the production build pass.

## Reproduce

```sh
node tools/repro-live-static-source-matrices.mjs --out static-source-proof
npx vitest run tests/presentation/staticSourceMatrices.test.ts
npm run build
```

The script defaults to the [published build](https://ael-dev3.github.io/Tervain/). It discovers actual hidden source meshes linked to replacement meshes in that scene, executes the exact baseline and candidate completion-loop policies on those parts, and counts actual `Matrix4.compose` calls over 120 forced scene matrix walks. It also compares all retained local/world matrices, endpoint pixels, draw calls and triangles. Unit tests exercise the complete builder, including parent movement, skipped parts and explicit manual matrices.

The unchanged-source control correctly fails the reduction assertion. The regression test fails on the original builder and passes after the fix. Receipts and matched images are in [proofs/static-source-matrices](../../proofs/static-source-matrices).

This is software-WebGL verification of redundant work and unchanged output. It is not 120 rendered gameplay frames, a hardware frame-time measurement, or an Apple GPU performance claim. Moving individual source parts after merging remains outside the builder's contract.
