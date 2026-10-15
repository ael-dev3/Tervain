# Full grass prefixes need one rank check

Follow-up to [#548](https://github.com/ael-dev3/Tervain/pull/548), with that branch (`a65b17257`) as the baseline. This does not recount its zero-density saving.

Fully dense grass tiles still binary-search their sorted rank buffers. Check the highest rank once; when it is below the existing cutoff, all instances qualify. Otherwise retain the original search. The guard runs only at full density, so partial-density searches do not gain an extra buffer read. An excluded or non-finite highest rank falls through to the existing behavior.

## Reproduce

```sh
node tools/repro-live-grass-full-density.mjs --out grass-full-density-proof
```

The default target is [the published game](https://ael-dev3.github.io/Tervain/). The script captures actual calls from both native grass layers during 120 scripted turning-grove updates, resetting the native reserve allowance between updates. Copies of each tile's native rank buffer preserve the contents of recycled tiles. It replays the same captured distances and buffers through native, baseline and candidate methods, requiring every result to match the native call exactly.

Counters measure the replayed source-method rank reads, including the new highest-rank checks. The candidate must eliminate full-density binary-search reads; partial-density read counts must remain unchanged. Because native reserve building has a time budget, query totals may differ between separate runs. All compared methods use the same captured corpus within each run.

Screenshots are frozen full-scene endpoint controls after normal world synchronization. They are not independent motion clips or three separately simulated builds. Dynamic correctness is established by exact method-result replay. Draw/triangle/texture counts describe the warmed endpoint.

`--candidate-ref a65b17257` is the unchanged-source negative control, which must fail the work-reduction check while preserving counts and pixels.

## Recorded result

Published **0.0.18 · 421d34b**, low preset, software WebGL:

| Work | Baseline (#548) | Candidate |
| --- | ---: | ---: |
| Native density queries | 7,909 | 7,909 |
| Full-density queries | 1,521 | 1,521 |
| Full-density rank reads | 8,541 | 1,521 |
| Total rank reads | 23,295 | 16,275 |
| Zero-density reads | 0 | 0 |
| Endpoint draws | 119 | 119 |
| Endpoint triangles | 788,902 | 788,902 |
| Endpoint texture count | 120 | 120 |

Total rank reads drop about **30% beyond #548** for this corpus. All 7,909 counts match native exactly (SHA-256 `ca36ddf839bf8a7b28dfc0abfa8c6185dc07c89c0df9cc088a59622aa25218e3`); endpoint pixels are identical.

[Report](../../proofs/grass-full-density/report.json), [native control](../../proofs/grass-full-density/native.png), [before](../../proofs/grass-full-density/before.png), [after](../../proofs/grass-full-density/after.png).

Validation: 31 targeted tests and production build pass. The focused test checks one-read full retention, partial density, zero density and excluded/non-finite highest-rank fallbacks. Hardware play-gate verification is pending; no hardware FPS, frame-time or GC improvement is claimed. This does not establish that village-pan hitches are resolved.

The unchanged-source control (`--candidate-ref a65b17257`) correctly failed the work-reduction gate while preserving native counts and pixels: [control receipt](../../proofs/grass-full-density/unchanged-source-control.json).
