# PR 767: current-main verification

Base 0.0.46 `cb389782c4137385bcae9adb231b17453222ebc6`; source head `ee156e8cb3dc83e8cbf984522fd77acbd00a74f7`. Implementation patches rebased unchanged (range-diff attached). Focused regressions and production build pass; raw logs included. Earlier native screenshots/CPU evidence on the PR retain their original revision labels; no fresh 0.0.46 native or hardware timing claim.

Unmodified stock budget: two same-revision live probes / four completed frames each; no allowances or injected init script.

| Metric | Live | Candidate |
| --- | ---: | ---: |
| Draws | 284 | 284 |
| Triangles | 2956234 | 2956234 |
| Console errors | 0 | 0 |

`play-gate: PASS ee156e8cb`

Preview origin and execution-root labels are anonymized in logs. This is a software deterministic budget, not a Mac pacing/heat receipt.
