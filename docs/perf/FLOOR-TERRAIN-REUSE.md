# Forest-floor terrain sample reuse

The published 0.0.18 · 421d34b forest-floor population builder repeats the centre-height lookup for accepted placement attempts and repeats the slope lookup for logs. Each repeated slope query also interpolates four terrain heights. This change reuses the values already obtained during rejection checks, within the same synchronous placement attempt. Rejection order, terrain normals, edge-contact checks and random streams stay the same.

## Reproduction

```sh
node tools/repro-live-floor-terrain-reuse.mjs --out floor-terrain-proof
```

The default target is [live Pages](https://ael-dev3.github.io/Tervain/). The script loads the published world, captures its retained canonical trees, exclusions and crown field, then runs the actual baseline and candidate population builders with that terrain. It counts real `heightAt`/`slopeAt` calls, including height calls made inside slope and exclusion checks, and restores both methods before rendering. It compares every piece property and the low/medium/high selections. It rebuilds each floor in the original scene, through native post-processing/MSAA, and requires both images to equal the original native image.

The control command adds `--candidate-ref 421d34b`. It must exit nonzero: unchanged code must not satisfy the work-reduction assertion.

## Before/after receipt

[Machine-readable report](../../proofs/floor-terrain-reuse/report.json) · [unchanged-source control](../../proofs/floor-terrain-reuse/unchanged-source-control.json) · [before image](../../proofs/floor-terrain-reuse/before.png) · [after image](../../proofs/floor-terrain-reuse/after.png)

| One native population build | Baseline | Candidate |
| --- | ---: | ---: |
| Height queries, including internal calls | 10,870 | 10,111 |
| Slope queries | 1,094 | 1,076 |
| Pieces | 545 | 545 |
| Low / medium / high selected pieces | 197 / 365 / 545 | 197 / 365 / 545 |
| Draw calls in matched capture | 245 | 245 |
| Triangles in matched capture | 1,889,302 | 1,889,302 |

The 453-tree retained population produces exactly equal piece records and selections (`eb72325d983dcf4a583a55889a61bdd8d850bddc82273e91056be9c37f7fdbff`). Original native, baseline-rebuilt and candidate-rebuilt scene pixels are identical. Height work falls by 759 calls (7.0%); 18 redundant slope queries account for 72 of those calls. The unchanged-source control retains 10,870 / 1,094 queries and correctly fails the reduction assertion.

Validation: all 18 forest-floor/planted-crown tests pass with the CI test timeout; type-check and production build pass. No visual settings or geometry changes.

## Scope

This removes redundant work during forest-floor population construction. It is not a per-frame saving or a hardware frame-time measurement, and does not resolve crown floaters, grass shimmer or the outstanding Mac frame-pacing gate. The rendered receipt uses software WebGL at low quality; population selections are compared at all three quality levels. Texture counts include temporary replacement-floor textures used by the proof, and are not a native memory-saving claim.
