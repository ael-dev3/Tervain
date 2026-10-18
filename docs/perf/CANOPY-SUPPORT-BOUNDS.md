# Reuse canopy support-search bounds

Live reproduction: **0.0.29 · 2a13d6c**, complete registered population at every LOD. The support-search traversal calculates each child's box-to-sample distance to choose traversal order, then immediately calculates it again when visiting that child. The sample and box are unchanged between those calls.

Reuse that lower bound as a numeric argument to the child visit. The nearest contact distance can shrink after the first child, so the cached second-child bound is still compared against the updated nearest distance. Root evaluation remains after its budget charge. Traversal order, triangle tests, early exits, operation accounting and all audit thresholds stay unchanged.

This changes only the explicit on-demand `auditCanopies` diagnostic. It does not change the generator, tree geometry, materials, shaders or ordinary gameplay updates. Candidate: `7ebd69567f22649c0e04dab52f52bfe9cb835283`.

## Native report and query verification

Options: `alpha:false, gap:0.75, woodReach:1.5, maxOperations:300000000`, each `lod` in 0/1/2. The reusable driver compares the published native audit, the original source implementation and the candidate on the same native inputs. Original must match native before candidate results are accepted. Every original/candidate report field is deeply equal, including operation accounting and all per-tree findings.

| LOD | Trees | Distance queries before → after | Charged operations, both | Detached cards / clumps, both |
| --- | ---: | ---: | ---: | ---: |
| Near | 451 | 12,658,279 → 6,615,645 | 12,541,370 | 8,928 / 693 |
| Middle | 451 | 6,463,602 → 3,356,386 | 6,750,912 | 24,477 / 396 |
| Far | 451 | 483,506 → 265,700 | 1,080,362 | 14,972 / 522 |

Total distance queries: **19,605,387 → 10,237,731**. The operation limit is not relaxed or bypassed. These are rest-geometry flags summed over all registered tree placements, not visible-tree counts or confirmed visual defects. Alpha cutout and shader wind are excluded from this audit run; the findings still require visual review.

[Raw complete reports and samples](proofs/canopy-support-bounds/report.json.gz); [summary, source/report hashes and worst ten near targets](proofs/canopy-support-bounds/summary.json).

## CPU and rendered confirmation

After one warmup per implementation, run sixteen full near-LOD audits in balanced A,A,B,B,B,A,B,A,A,B,A,B,B,A,B,A order, eight calls each. No counter wrapper is installed during timing. Timings are wall-clock JS duration of the complete on-demand call, including allocations/GC, not game-frame or hardware GPU time.

| CPU ms / complete near audit | Original | Candidate |
| --- | ---: | ---: |
| Average | 1,414.69 | 1,347.88 |
| p95 (eight samples) | 1,442.10 | 1,406.20 |
| Range | 1,396.00–1,442.10 | 1,317.90–1,406.20 |

At a frozen native forest view, call each implementation and capture the full scene through native post/MSAA. Loading raster suppression is restored before these captures. Both renders: **364 draws / 5,848,988 triangles**. PNG bytes and decoded pixels are identical; [one retained matching image](proofs/canopy-support-bounds/forest.png). Console errors: zero. Added regular-frame JS, draws, triangles and shader taps: zero. This diagnostic-only saving does not establish an ordinary frame-rate, heat or Apple GPU improvement.

## Regression tests and reproduction

The original code fails the supported-card regression with **96 repeated bound/sample checks** for 32 cards. The candidate evaluates each bound/sample pair once. Tests cover intersecting support, nearby support, refinement beyond the minimum threshold and out-of-range support. The existing alpha-sampling, transforms, thresholds, budget-exhaustion and detached-set tests pass: **34 focused tests**, type-check and production build.

Reusable [live-source driver](../../tools/repro-live-canopy-support-bounds.mjs):

```sh
node tools/repro-live-canopy-support-bounds.mjs --out canopy-support-proof --url https://ael-dev3.github.io/Tervain/ --baseline-ref 2a13d6c
```

A preliminary [geometry/material screen](proofs/canopy-support-bounds/geometry-screen.json) found no zero-area or non-finite triangles in 120 distinct wood/leaf geometries seen across all LODs, and no differing map/alpha-map channels in the checked tree batches. Those leads were ruled out; this patch does not change their handling.

## Exact-head budget status

The immutable compiled candidate is running the full native High Retina budget against two live probes, using #673 startup plus #678 completed-frame sampling. No allowances or raster suppression. No PASS is claimed until completion.
