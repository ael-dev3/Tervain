# Forest render-pair CPU check: candidate withdrawn

Source candidate `eba5bae11b60c6b9a3c47720596f3960ac2fa7b9`; live **0.0.33 / b317734**. Four independent browser profiles in **live / candidate / candidate / live** order, native unmodified Array iterator, High, six moving/turning forest camera poses. Each profile warms 3,000 native forest module updates, then records 12 blocks of 500 updates. Camera preparation is outside each timed update. Simulation/wind are frozen and dt is zero; this is a camera-only module replay, **not full-frame gameplay or hardware/Mac performance**. Raster is intentionally suppressed throughout this CPU-only check; the separate native RGB proof and stock budget gate use real raster.

| Trial | Mean forest update, ms | Nominal p95, ms |
| --- | ---: | ---: |
| Live A | 0.092450 | 0.2 |
| Candidate A | 0.106817 | 0.2 |
| Candidate B | 0.106283 | 0.2 |
| Live B | 0.098733 | 0.2 |

Mean of the two live profiles **0.095592 ms**; candidate **0.106550 ms**, difference **0.010958 ms / 11.5%** in this module replay. P95 ties at the clock's approximately 0.1 ms quantization resolution. Full blocks and observed maxima are retained, not just the summary.

**Withdraw #719.** Its exact-head stock gate, six native RGB comparisons and regression all pass, but those cannot establish a CPU improvement. The iterator-based regression observes known pair-list source sites; overriding Array iteration can change optimization behavior and is not a normal heap-allocation/GC profile. Without that observer, these warmed measurements do not support shipping the key-loop replacement. No claim is made that whole-game frame time rose by this percentage, that the difference is caused by a specific JIT transformation, or that it reproduces a hardware pacing failure.

`repro.mjs` retains the executed method, with output/import paths made portable and the candidate address supplied through `CANDIDATE_URL`. The completed profiles were sequential, with no second full-world browser running alongside them. No product logic or budget rule was changed for these measurements.
