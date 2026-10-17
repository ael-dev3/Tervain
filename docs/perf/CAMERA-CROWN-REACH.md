# Camera crown-query reach

The foliage-camera query scans grid cells using the largest crown radius, then also uses that largest radius to admit every smaller crown. Consequently a small crown can be returned even when neither its fringe nor its core can reach any point along the requested boom. Each admitted crown then enters the camera's sampled core checks.

Keep the existing conservative grid scan, but filter each candidate centre against **requested radius + that crown's own horizontal radius**. Preserve cell traversal and list order. The core is only 75% of that horizontal radius, so a rejected crown cannot intersect the boom. This changes no geometry, materials, camera collision policy or minimum boom length.

## Reproduce

```sh
node tools/repro-live-camera-crown-reach.mjs \
  --url https://ael-dev3.github.io/Tervain/ \
  --out camera-crown-reach-proof
```

The runner uses the native published crown objects and follow camera. The baseline query lists must match native identity and order. It compares 360 terrain-following camera updates over walk-fence, forest/resume and grove fixtures, including turns and looking upward. Every position, orientation, boom length and body-visibility result must match the native camera. The unchanged `crownBoom` function is instrumented only to count core tests; its computed lengths must match between arms. Final screenshots use the native Grade/post render path.

[JSON receipt](../../proofs/camera-crown-reach/report.json), [before](../../proofs/camera-crown-reach/before.png), [after](../../proofs/camera-crown-reach/after.png).

These are deterministic query/core-test counts on the Low scene and exact camera-state/pixel comparisons, not hardware timings or proof that historical missed refreshes are fixed. This is CPU broad-phase cleanup; foliage appearance remains unchanged. Related: [#326](https://github.com/ael-dev3/Tervain/issues/326).

Validation: production build and 30 crown, camera-rig and obstruction tests pass. The small-crown over-selection regression fails on the baseline and passes after the filter change. The 600 deterministic clearance cases compare the filtered query to the full population in the same stable cell order, covering varied crown widths/heights, elevated pivots, turn directions and boom lengths. Existing query-boundary and camera-obstruction behavior remain covered.

## Published-scene result

0.0.18 · 421d34b, 341 native crowns:

| Grove fixture, 120 camera updates | Before | After |
| --- | ---: | ---: |
| Returned crown candidates | 1,137 | 252 |
| Sampled core tests | 35,247 | 7,812 |

Both reductions are **77.84%**. The walk-fence and forest/resume controls returned no crowns on these fixture paths and remain unchanged. Across all 360 camera updates, both arms match the native position/orientation/boom/body-visibility hash (`20358e43…be41bba`). Computed crown-boom hashes match between arms, and final images are pixel-identical. Final post-render draw calls, triangles and texture count remain 124 / 668,471 / 114.
