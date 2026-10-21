# PR #751: verification after rebase onto 0.0.43

Head `6cac9a12fca32ab867920097f4ab85a36d266dcd`, base `8e96a18685371ead1eb3b0c1c25147223e3b4e4d`. The implementation patch is unchanged by the rebase (`git range-diff`); no additional runtime change is included. This evidence refreshes rendered output and the unmodified compiled budget for the new head. Prior CPU/counter studies in the PR remain historical rather than silently relabelled as new measurements.

Both floor algorithms receive identical native updates. All packed buffers, visible prefixes and counts compare; each image mode applies its data to the same registered native meshes. The comparison group is not added to the scene. No new CPU timing was taken; the original immutable CPU study stays scoped to its original base.

Normal raster/post/MSAA is restored and asserted before screenshots, fixed scene state, rebuilt shadow/reflection state. Each image is 640×360 High; the stock budget uses its own Retina DPR2 placement, so absolute counts differ. No shader styling, menu or humor change is added by rebasing.

| Pose | Draws each | Triangles each | Changed RGB pixels |
| --- | ---: | ---: | ---: |
| fence | 644 | 7034304 | 0 |
| run-round | 253 | 2192347 | 0 |
| bow | 749 | 7801778 | 0 |
| birch | 479 | 5708063 | 0 |
| sea | 244 | 1881379 | 0 |

[Stock current-head receipt](budget.txt), no allowances, init hook or sampler edits. Software WebGL budget is not a Mac hardware frame-pacing or heat measurement. Historical live16 ~33 ms stalls and overall 10/10 coverage are not closed by a rebase.

The matching source-paired native tool is `tools/repro-pr-751-rebased-native.mjs`; install repository dependencies, fetch the pinned base if shallow, configure Chrome and run it from the repository root with an optional output-directory argument. Local tests/build logs and all repeated images/hashes are included.
