# PR #753: verification after rebase onto 0.0.42

Head `8d75a56f9beadaed9cc6ddeceb8bc91f4aed0287`, base `c00be101c89e8a62f6e14a53fcaa1ac85f3b096b`. The implementation patch is unchanged by the rebase (`git range-diff`); no additional runtime change is included. This evidence refreshes rendered output and the unmodified compiled budget for the new head. Prior CPU/counter studies in the PR remain historical rather than silently relabelled as new measurements.

Two separate source-paired native worlds run the original and candidate repair on the rebased base. Opaque audits are complete, per-mode image repeats are stable and draw/triangle counts match in each view. Changed pixels are a correction, not a pixel-identity claim. Added alpha probes and split vertices are retained in raw construction records; elapsed construction sums are single instrumented observations, not hardware frame timing or paired warm CPU benchmarks. Broad distance flags and visual quality remain separate.

Near audit: isolated opaque candidates **53→0** across 451 trees. Other distance-flagged clumps **5044→4974**; these are not claimed fixed.

before: 63 template calls; alpha probes 4,872,476; hint calls 18,158; vertices added 1032; dropped islands 0.

after: 63 template calls; alpha probes 15,955,308; hint calls 18,158; vertices added 1058; dropped islands 0.

Normal raster/post/MSAA is restored and asserted before screenshots, fixed scene state, rebuilt shadow/reflection state. Each image is 640×360 High; the stock budget uses its own Retina DPR2 placement, so absolute counts differ. No shader styling, menu or humor change is added by rebasing.

| Pose | Draws each | Triangles each | Changed RGB pixels |
| --- | ---: | ---: | ---: |
| fir-overview | 822 | 11584065 | 6 |
| fir-lower | 297 | 4230024 | 0 |
| fir-upper | 294 | 4178738 | 0 |
| fence-control | 644 | 7104866 | 0 |
| sea-control | 244 | 1881379 | 0 |

[Stock current-head receipt](budget.txt), no allowances, init hook or sampler edits. Software WebGL budget is not a Mac hardware frame-pacing or heat measurement. Historical live16 ~33 ms stalls and overall 10/10 coverage are not closed by a rebase.

The matching source-paired native tool is `tools/repro-pr-753-rebased-native.mjs`; install repository dependencies, fetch the pinned base if shallow, configure Chrome and run it from the repository root with an optional output-directory argument. Local tests/build logs and all repeated images/hashes are included.
