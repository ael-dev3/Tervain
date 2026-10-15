# Reuse animal arrow-cell bounds within a pose

On published [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/), animal arrow contacts already reuse posed vertices across ballistic subsegments. Their conservative collision-cell boxes are still rebuilt on every query: each cell unions its rest bounds transformed by every contributing joint. Those transforms do not change between subsegments of the same posed frame.

The candidate retains one world-space box per collision cell and rebuilds it under the existing pose/geometry invalidation. Bone transforms, root movement/scaling, geometry attribute versions and morph-target invalidation retain their existing behavior. Broad-phase rejection, triangle traversal, hit classification and vertex caching are unchanged.

## Native before/after proof

`tools/repro-live-animal-cell-bounds.mjs` compiles the actual baseline and candidate contact classes and runs both against the same delivered tiger skin from the published world. Its unmodified native animal contact adapter is an independent rest-pose control: all 81 rest-grid results match it exactly.

The comparison uses four frozen poses: the current animated pose, a controlled head-bone offset, root translation, and nonuniform root scaling. For each pose it traces an 81-ray grid twice, including the cold rebuild. These are exhaustive query fixtures, not a claim that 162 queries occur every real frame.

| Measurement | Baseline | Candidate |
| --- | ---: | ---: |
| Queries across four poses | 648 | 648 |
| Non-null hits | 392 | 392 |
| Cell/joint box transforms inside `trace` | 333,720 | 2,060 |
| First 81-query pass, each pose | 41,715 | 515 |
| Repeated 81-query pass, each pose | 41,715 | 0 |
| Complete result SHA-256 | `d2d1e2a0…e9bf15cf` | same |
| Native Grade/post pixels after restoring pose | baseline | identical |

The complete result hashes include hit/miss, zone, point coordinates and distance, separately for every pose. All four changed-pose fixtures rebuild the candidate bounds. The focused regression also moves the head outside its old cell footprint, checks a hit at its new position and a miss at its old position, and checks translation/scaling behavior.

Cost: one retained `Box3` per collision cell, **92 boxes for this tiger**, replacing the single shared scratch cell box. The contact surface is still created lazily when a ray first reaches an animal. This is a CPU/memory tradeoff, not a total-allocation or memory reduction. Reuse depends on how many queries reach an unchanged pose; a changed pose still pays for its first rebuild. Morph-target surfaces retain per-query invalidation.

Receipts: [JSON](../../proofs/animal-cell-bounds/report.json), [before](../../proofs/animal-cell-bounds/before.png), [after](../../proofs/animal-cell-bounds/after.png). A [hidden-animal control](../../proofs/animal-cell-bounds/before-empty.png) differs by 14,053 pixels, establishing that the animal is visible in the matched images. The animal is frozen at its current animation sample for the fixture.

## Reproduce

```sh
node tools/repro-live-animal-cell-bounds.mjs --url https://ael-dev3.github.io/Tervain/ --out animal-cell-bounds-proof
npx vitest run tests/presentation/animalHunting.test.ts
npm run build
```

The native script asserts exact result hashes, the native rest control, nonzero contacts, reduced transform counts, cold rebuilds after pose changes, zero repeated-pass rebuilds, visible animal pixels and identical before/after images. The recorded run passed. All 17 focused hunting tests and the production build passed.

These are source-level CPU-work counts and software-WebGL evidence. They do not identify the historical live16 33 ms bow frame's cause or demonstrate an Apple GPU frame-time improvement. A complete candidate-build hardware play gate remains required; the night/mud hitch is not claimed fixed.
