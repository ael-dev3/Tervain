# PR #750: verification after rebase onto 0.0.43

Head `c3fa5d2c83153681f18a0dd25efab7d18eb5a5fc`, base `8e96a18685371ead1eb3b0c1c25147223e3b4e4d`. The implementation patch is unchanged by the rebase (`git range-diff`); no additional runtime change is included. This evidence refreshes rendered output and the unmodified compiled budget for the new head. Prior CPU/counter studies in the PR remain historical rather than silently relabelled as new measurements.

The two seat algorithms run on the same actual resident inputs before installation; complete offsets compare bit-for-bit. Switching the already-equal values supplies output proof, not independently timed load/adoption sequences. No new CPU timing was taken; the original immutable CPU study stays scoped to its original base.

Normal raster/post/MSAA is restored and asserted before screenshots, fixed scene state, rebuilt shadow/reflection state. Each image is 640×360 High; the stock budget uses its own Retina DPR2 placement, so absolute counts differ. No shader styling, menu or humor change is added by rebasing.

| Pose | Draws each | Triangles each | Changed RGB pixels |
| --- | ---: | ---: | ---: |
| fence | 731 | 8319018 | 0 |
| run-round | 269 | 2673593 | 0 |
| bow | 801 | 9082840 | 0 |
| birch | 511 | 6670555 | 0 |
| sea | 276 | 2843871 | 0 |

[Stock current-head receipt](budget.txt), no allowances, init hook or sampler edits. Software WebGL budget is not a Mac hardware frame-pacing or heat measurement. Historical live16 ~33 ms stalls and overall 10/10 coverage are not closed by a rebase.

The matching source-paired native tool is `tools/repro-pr-750-rebased-native.mjs`; install repository dependencies, fetch the pinned base if shallow, configure Chrome and run it from the repository root with an optional output-directory argument. Local tests/build logs and all repeated images/hashes are included.
