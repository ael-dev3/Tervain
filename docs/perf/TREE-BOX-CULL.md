# Reject empty regions of tree culling spheres

The High forest on [Pages](https://ael-dev3.github.io/Tervain/) 0.0.21 · 570a859 uses source-derived spheres for colour and sun-shadow selection. A tall, narrow tree's sphere includes large empty regions beside the trunk/crown. Those regions can intersect a camera even when the source geometry and its guard lie completely outside it, submitting extra tree instances into colour, leaf-depth and shadow passes.

The candidate caches a world box per placement, covering **all three source LODs after leaf repairs**, rotation/scale and the existing two-metre guard. It keeps the original sphere broad phase, then requires the box to intersect the same frustum. Shadow reach, distance/LOD weights, mesh geometry, materials and visual settings retain their existing behavior. Boxes allocate during construction; refreshes only test cached bounds.

## Reproduce

```sh
node tools/repro-live-tree-box-cull.mjs --url https://ael-dev3.github.io/Tervain/ --out tree-box-proof
npx vitest run tests/presentation/foliageEngine.test.ts tests/presentation/pineForestIntegration.test.ts tests/presentation/meshyForestWorld.test.ts
npm run build
```

The verifier uses the published native 640×360 High scene and Grade/post/MSAA output. It captures native forest placements, constructs the same source boxes, and adds the candidate box test only to their existing sphere/frustum tests. It scans eight headings at each of two forest locations, selects the largest geometry reduction at each location, and keeps the meadow as a control. This selection uses geometry counts, not timing results.

Between A/B draws it refreshes only forest selection using the native frame context, avoiding unrelated grass streaming. Wind strength is one, with a fixed clock per view. Both variants warm before balanced software GPU queries. Screenshots are read synchronously before awaiting query completion; blank or changed images fail the verifier. Actual draw calls, triangles, source upload bytes, nominal texture storage and pass breakdowns are recorded.

Headless runs use software WebGL; `--headed 1` allows the same check on a machine with a hardware-backed display. Software GPU queries are not Mac frame cadence. Hardware validation remains required, including wind/strike and moving-camera coverage. The added CPU box tests trade a small culling cost for fewer submitted instances; no target-device FPS claim is made.

[Matched captures and receipt](proofs/tree-box-cull/).

The narrow-view regression checks actual packed placement matrices against an independent all-LOD source-bound reference. It fails against published source 570a859 and passes with this change. The 44 selected tests and build pass.

| View | Draws | Triangles before → after | Saved triangles | Buffer/texture upload bytes/frame |
| --- | ---: | ---: | ---: | ---: |
| Forest (-210, 0), heading 45° | 402 | 6,329,553 → 6,149,664 | 179,889 (2.84%) | 32,256 |
| Woodland (-180, 12), heading 45° | 372 | 5,189,324 → 5,043,144 | 146,180 (2.82%) | 27,648 |
| Meadow control (-2, 38) | 238 | 2,487,153 → 2,487,153 | 0 | 6,912 |

All three nonblank captures match exactly. Draws, shadow triangles, uploads and texture storage match before/after. The savings come from wood colour and leaf depth/colour submission. Texture count stays 274; observed nominal texture storage is 1,310,276,620 bytes, with no unknown formats. The adapter checks all 451 placements.

Balanced two-sample software GPU-query medians (draw work only; CPU selection runs outside the query):

| View | Before ms (range) | After ms (range) |
| --- | ---: | ---: |
| Forest | 12,917 (12,632–13,203) | 12,483 (12,467–12,499) |
| Woodland | 10,264 (10,221–10,307) | 10,357 (10,290–10,424) |
| Meadow control | 3,775 (3,757–3,794) | 3,714 (3,684–3,745) |

The first forest median improves about 3.4%; woodland is inconclusive with overlapping ranges and a 0.9% higher median. The unchanged meadow also varies, so the deterministic result is the removed geometry and identical images. These software timings do not establish end-to-end hardware frame-time improvement.
