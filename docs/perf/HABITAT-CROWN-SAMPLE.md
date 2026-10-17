# Reuse the crown sample within each habitat node

Grass streaming fills a 17×17 habitat raster per 32 m tile. On published 0.0.18 · 421d34b, each node asks the same planted crown field at the same position twice: once inside soil blending and again for its grass shade channel. This repeats the spatial lookup, crown transforms and mask interpolation.

Read the crown value once per node and pass it through the existing `groundSplat` sampled-canopy parameter. Keep the original raw value for soil blending and the existing clamp for the grass shade channel. Source-free authoring still uses its original woodland fallback. No persistent cache or visual policy changes.

## Reproduce

```sh
node tools/repro-live-habitat-crown-sample.mjs \
  --url https://ael-dev3.github.io/Tervain/ \
  --out habitat-crown-proof
```

The runner obtains the native grass generator's retained Habitat through its DevTools closure scope. It uses the actual published crown field, terrain, generator and existing grass meshes. Each arm starts with an empty habitat raster cache and refills the same native tiles. The native evaluator is the control; only `evalNode` is replaced with the baseline/candidate source method for the other arms. Counters wrap the native crown field and node evaluations.

Every generated active base/shape/tint/slope buffer, instance count, tile bound and complete habitat raster must match the native control exactly. The native refill must also match the original published tile data. The full scene is refreshed at the capture camera before the matched screenshots render those refilled meshes through the native Grade/post path.

[JSON receipt](../../proofs/habitat-crown-sample/report.json), [before](../../proofs/habitat-crown-sample/before.png), [after](../../proofs/habitat-crown-sample/after.png).

This measures CPU query work during raster generation, not hardware frame times, all streaming cost, or grass shimmer. It does not establish that historical ~33 ms frames are fixed. Related: [#326](https://github.com/ael-dev3/Tervain/issues/326).

## Matched result

| Regeneration fixture | Before | After |
| --- | ---: | ---: |
| Grass tiles / instances | 31 / 4,088 | 31 / 4,088 |
| Habitat raster tiles / nodes | 22 / 6,358 | 22 / 6,358 |
| Crown-field queries | 12,716 | 6,358 |
| Final draw calls | 221 | 221 |
| Final triangles | 1,780,529 | 1,780,529 |
| Texture count | 139 | 139 |

Native and reconstructed-baseline controls agree. Generated-buffer/bounds hash `20d09afa…dc161aa` and full raster hash `6ab48c31…be8199f` match for every arm; final pixels are identical. Crown queries are reduced by **50%** on cold raster generation, not on already-cached tile reads.

Production build and 34 habitat, planted-crown, grass-engine and forest-floor tests pass. The new query-count regression fails on the baseline (578 calls for one 289-node tile) and passes after the change (289), including a later cold tile and unchanged cached reads. The source-free woodland fallback remains covered.
