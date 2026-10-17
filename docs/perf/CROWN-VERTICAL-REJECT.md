# Skip vertically unreachable camera crowns

The follow camera samples each returned crown along its boom, even if the whole boom lies below or above that crown's core. Reject only those disjoint height ranges before the sampled checks. The bound uses the complete requested boom, the existing crown core height and floor, and a conservative rounding guard. Intersecting crowns retain the same sampled collision logic, order, clearance and minimum boom length.

## Reproduce

```sh
node tools/repro-live-crown-vertical-reject.mjs \
  --url https://ael-dev3.github.io/Tervain/ \
  --out crown-vertical-proof
```

The runner uses native published terrain, colliders and crown-query results. It reconstructs complete `CameraRig` components from the published source, importing the actual baseline/candidate crown helper into `follow()`. Counters come from the helper module bound to that component; an invariant checks that every camera update calls it. The baseline component must match the native camera's positions, orientations, boom lengths and body visibility exactly.

Each arm performs 360 terrain-following walk/turn/look-up updates across walk-fence, forest/resume and grove fixtures. The runner tests both the published crown query and the individual-reach query introduced separately in [#538](https://github.com/ael-dev3/Tervain/pull/538). Final native Grade/post images must match the original camera as well as both reconstructed components. Another 1,000 deterministic helper cases exercise varied pivots, directions, lengths and mixed crown sizes/floors, including shortened booms.

[JSON receipt](../../proofs/crown-vertical-reject/report.json), [native control](../../proofs/crown-vertical-reject/native.png), [before](../../proofs/crown-vertical-reject/before.png), [after](../../proofs/crown-vertical-reject/after.png).

This measures sampled core-test counts on the Low published scene, not hardware frame times or total camera cost. It does not establish that historical missed-refresh frames are fixed. No foliage, shader or camera-clearance policy changes. Related: [#326](https://github.com/ael-dev3/Tervain/issues/326).

## Matched result

Published 0.0.18 · 421d34b; the grove portion accounts for the sampled work, while the other two fixtures remain empty-crown controls:

| Query policy, 120 grove updates | Candidates (unchanged) | Core tests before | Core tests after |
| --- | ---: | ---: | ---: |
| Published | 1,137 | 35,247 | 14,849 |
| Individual reach (#538) | 252 | 7,812 | 4,929 |

This removes about 58% and 37% of sampled core tests respectively. All 360 camera states per arm match the native control (`20358e43…be41bba`), and crown-boom hashes match. Native/baseline/candidate final images are pixel-identical. Final draw calls, triangles and texture count remain 124 / 668,471 / 114. All 1,000 additional deterministic helper cases match, including 144 shortened booms.

Production build and 30 camera/crown/obstruction tests pass. New work regressions for crowns above and below the full boom range fail on the baseline and pass after rejection. They live in a separate test file so this change can combine with #538's tests without overlapping additions.
