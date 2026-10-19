# Shared canopy connectivity bound reuse

Live 0.0.29 · 2a13d6c still flags 977 cards in 14 clumps on `tree:wild:32:27` at near detail (`alpha:false`, gap 0.75 m, wood reach 1.5 m). Its largest recorded sampled wood gap is 2.5549 m. All 120 distinct registered geometry/LOD/part combinations use their complete draw ranges, so unused draw tails do not explain this case. These are rest-geometry audit flags, not a visual verdict.

The shared edge search measures both child box gaps to select traversal order, then measures those same gaps on child entry. Reuse each bound and compare it against the updated nearest distance. Zero bounds use nullish handling. Visit order, union results and charged operations remain unchanged. Generator placement, tree appearance, thresholds and shaders are untouched. This does not clear the floating-card flags.

## Live proof

`tools/repro-live-canopy-edge-bounds.mjs` runs native, original and candidate implementations on all 451 registered targets at each LOD. Complete reports, including operations, must deeply match.

| LOD | Original/native gap evaluations | Candidate | Charged operations, both |
| --- | ---: | ---: | ---: |
| 0 | 4,461,919 | 3,014,071 | 12,541,370 |
| 1 | 2,521,879 | 1,762,697 | 6,750,912 |
| 2 | 779,697 | 550,601 | 1,080,362 |
| Total | 7,763,495 | 5,327,369 | unchanged |

The requested oak's shared preparation helper also returns exactly equal parts, contacts, component flags and graph membership: 977 far cards, 14 clumps, 501,580 charged operations.

| Native forest proof | Original | Candidate |
| --- | ---: | ---: |
| Draws | 364 | 364 |
| Triangles | 5,848,988 | 5,848,988 |
| Changed image bytes / pixels | — | 0 / 0 |
| Console errors | 0 | 0 |
| Added ordinary-frame JS / shader work / uploads | — | 0 / 0 / 0 |

[Native forest image](proofs/canopy-edge-bounds/forest.png), [summary and timing samples](proofs/canopy-edge-bounds/summary.json), [complete reports and helper outputs](proofs/canopy-edge-bounds/report.json.gz), [draw-range screen](proofs/canopy-edge-bounds/draw-range-screen.json). The frozen native scene is rendered after each diagnostic implementation; this is not a two-binary image comparison. Loading raster suppression was fully restored before these captures; the first harness attempt was rejected by its raster guard because it used a mismatched restoration-hook name. No image proof from that attempt is used.

## CPU evidence and limitation

Eight warmed complete near audits per variant, balanced order, counters disabled: average 1,424.925 → 1,377.213 ms; p95 (the maximum of eight) 1,498.3 → 1,451.8 ms. This measures on-demand audit calls, not ordinary frames or Apple GPU performance.

The initial eight-call preparation-helper sample is worse: average 60.975 → 66.100 ms, p95 72.5 → 105.3 ms. All samples are retained. The larger confirmation uses 20 warmups and 48 timed calls per variant in three balanced batches, after the budget renderer exits. It does **not** clear the strict helper p95 criterion:

| Confirmation | Before average / p95 ms | After average / p95 ms |
| --- | ---: | ---: |
| Batch 1, 16 each | 60.906 / 103.0 | 55.606 / 83.4 |
| Batch 2, 16 each | 55.875 / 67.0 | 58.213 / 82.3 |
| Batch 3, 16 each | 62.350 / 108.4 | 60.431 / 85.8 |
| All 48 each | 59.710 / 82.5 | 58.083 / 83.4 |

[Every confirmation sample and exact helper outputs](proofs/canopy-edge-bounds/cpu-confirmation.json); reusable runner: `tools/repro-live-canopy-edge-cpu.mjs`. Average falls 2.7%, but p95 rises 0.9 ms and one batch is slower on both measures. The initial unfavorable sample is retained too. This remains draft for review; no load-time speedup or strict CPU non-regression claim. Ordinary gameplay does not call this helper.

44 focused tests, type-check and production build pass. Original fails the final work-budget regression (3,356 gap calls above the 2,600 cap); candidate passes without losing the 64-box chain or changing 2,442 charged operations. Five additional cutoff cases compare against exhaustive connectivity, including overlapping boxes and exact cutoffs.

## Exact-head native software budget

Compiled feature head `e66746b4ecf498c9f68e3127701b96003fe164b7`, #678 completed-frame sampler + #673 startup correction + #681 baseline identity guard. Both live probes report 2a13d6c. No allowance or raster suppression.

| Build | Max draws | Max triangles | Console errors |
| --- | ---: | ---: | ---: |
| Live 2a13d6c | 285 | 3,061,335 | 0 |
| Candidate e66746b | 285 | 3,061,335 | 0 |

Head matches, exit 0: `play-gate: PASS e66746b`. All build/software-WebGL/test CI checks pass. This clears the deterministic rendering budget, not the unresolved shared-helper p95 question or hardware frame pacing.
