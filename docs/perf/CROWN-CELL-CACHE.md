# Reuse crown query cells across camera updates

The follow camera queries crown volumes every update. The spatial index scans every grid cell in a rectangle expanded by the widest crown. Continuous camera movement often leaves that rectangle unchanged, but the index still repeats all of its Map reads, including empty cells.

Cache the occupied cell-list references for the last rectangle. Rebuild them only when a rectangle edge changes or a valid `add()` invalidates the cache. Every query still clears and recomputes its results using the current position, radius and crown fields. Cell order and within-cell insertion order are preserved. The cache uses one reusable array and four grid bounds; there is no coordinate-key or per-column metadata map.

This change builds on #538 (`544b4e4b8`) and keeps its individual-crown reach policy. The comparison baseline is that predecessor; candidate-count reductions from #538 are not counted again here.

## Reproduce

```sh
node tools/repro-live-crown-cell-cache.mjs \
  --url https://ael-dev3.github.io/Tervain/ \
  --out camera-crown-cell-cache-proof
npx vitest run tests/presentation/crownCellCache.test.ts \
  tests/presentation/cameraCrowns.test.ts \
  tests/presentation/cameraRig.test.ts \
  tests/presentation/cameraObstruction.test.ts
npm run build
```

The script uses the published world's 341 crown objects, native terrain, colliders and follow camera. Baseline/candidate indexes execute their actual source inside the camera's query callback. It runs 120 terrain-following turn/look-up updates on each of three routes. Every query's returned object identities/order must match the native query filtered by #538's existing reach policy. Both arms must also reproduce the unmodified published camera's full position, quaternion, boom distance and body visibility.

Counters instrument only the actual cell Map reads inside source queries, excluding index construction and diagnostic work. Final images pass through the native full-scene post-processing path after updating the world for that camera. Reports are deleted before a new run; assertion failures return a nonzero exit status.

## Receipt: published 0.0.18 · 421d34b

| Fixture | Camera updates | Cell Map reads before | After |
| --- | ---: | ---: | ---: |
| Walk-fence | 120 | 4,794 | 78 |
| Forest-resume | 120 | 5,092 | 169 |
| Grove | 120 | 4,933 | 205 |
| Total | 360 | 14,819 | 452 |

All routes improve. The same 252 crown results are returned in both arms, with the same per-query identities/order (`892ab5b4…d1168cfe`). All native camera states match (`20358e43…be41bba`). Native/before/after PNGs are pixel-identical. Draw calls **124**, triangles **668,471**, and texture count **114** remain unchanged. The passing report, source hash and matched images are committed under `proofs/crown-cell-cache/`.

The production build and 34 focused tests pass. The new lookup regression fails on the predecessor (36 reads) and passes with zero while movement changes the actual query result. Tests also cover adding a crown to a previously cached empty cell without changing the rectangle, range changes, invalid adds, and 600 full-population radius/order comparisons across signed cells of two sizes.

## Limits

These are deterministic camera-query work counts and software-WebGL pixels, not hardware frame times or proof that historical village-pan or >25 ms stalls are resolved. The fixtures are controlled camera-follow updates; only their final views are rendered for comparison. A changing rectangle still performs the original scan and records occupied lists for reuse. A hardware play-gate receipt remains outstanding. No crown geometry, reach policy, camera clearance, LOD, material or visual style changes.
