# Skip rank searches for fully faded reserve tiles

Grass streaming retains extra tiles beyond the visible fade so walking does not expose generation holes. Each update asks these tiles how many ranked instances to submit. Previously `instanceCountAt` binary-searched the rank buffer even when the density was already zero, then discarded the search result and returned zero.

Return immediately for zero density. Positive density retains the original conservative epsilon and binary search. This changes CPU work, not the tile population, fade, draw distance or rendered grass.

## Reproduce

```sh
node tools/repro-live-grass-zero-density.mjs --out grass-zero-density-proof
```

The default target is [the published game](https://ael-dev3.github.io/Tervain/). The repro captures both native grass layers and records their actual density calls during 120 updates along a turning grove route. Each update starts a new native reserve-building allowance through `prepare`; reduced motion skips GPU trample work during this CPU replay. It copies each native tile's rank buffer when first encountered or recycled, then replays the captured distance and buffer through native, baseline and candidate methods. Every returned instance count must match the original call exactly.

The native reserve deadline makes the captured tile population scheduling-dependent. The gate compares all methods on the same captured corpus rather than requiring one fixed query total across separate runs.

Instrumentation counts source-method calls and rank comparisons, including comparisons performed at zero density. The gate requires an actual nonempty tile corpus, native zero-density queries, positive baseline wasted reads and zero candidate reads for those queries. The reduction in total reads must equal the removed zero-density reads.

Native/before/after screenshots are frozen endpoint controls through the native renderer. They are not independent motion clips. The captured query replay verifies dynamic count behavior. This does not measure hardware frame timing or establish that the remaining village-pan hitch is fixed.

Run with `--candidate-ref 421d34b` for an unchanged-source negative control, which must fail the work-reduction assertion while retaining matching counts and pixels.

## Recorded result

Published **0.0.18 · 421d34b**, low preset, software WebGL, 120 scripted updates with native per-update reserve resets:

| Work | Before | After |
| --- | ---: | ---: |
| Native density queries | 7,942 | 7,942 |
| Zero-density queries | 4,368 | 4,368 |
| Rank-buffer reads | 55,715 | 23,295 |
| Reads at zero density | 32,420 | 0 |
| Endpoint draw calls | 119 | 119 |
| Endpoint triangles | 788,902 | 788,902 |
| Endpoint texture count | 120 | 120 |

Total rank reads drop about **58%** for this corpus. All returned counts match native exactly (SHA-256 `c451e175f0e318d69002cf2072340b30de0588a4a86103c1e15ba9e7030ded28`). Native/before/after endpoint pixels are identical. The capture includes 7,667 queries of nonempty native tiles.

[Machine-readable receipt](../../proofs/grass-zero-density/report.json), [native control](../../proofs/grass-zero-density/native.png), [before](../../proofs/grass-zero-density/before.png), [after](../../proofs/grass-zero-density/after.png).

Validation: 30 targeted tests pass (density guard, ground visibility, capture ranks and grass engine); production build passes. Hardware play-gate verification remains pending. No hardware FPS, frame-time or GC gain is claimed.
