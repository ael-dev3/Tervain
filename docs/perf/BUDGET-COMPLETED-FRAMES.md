# Completed-frame budget sampling

On live 0.0.29 · d244d39, four budget reads spaced 1.5 seconds apart all returned renderer frame 137 / simulation step 32: 226 draws, 2,414,180 triangles. The preceding completed frame at the identical player and camera pose reported 285 draws and 3,061,335 triangles. Thus four wall-clock reads did not represent four rendered frames. A slow software-rendered frame lasted 18.316 seconds.

Reproduction: run the budget probe at its normal High Retina profile, recording `renderer.info.render.frame`, `simStep` and `perf.samples.at(-1)` alongside each count. The four reads reproduced exactly the same frame number and sample object. No console errors were observed.

The recorder now observes `PerfMeter.end`, after each game's final draw submission. It retains four completed frames starting with placement at the canonical view, including the initial refreshed auxiliary passes. This intentionally replaces the old post-settle wall-clock sampling window. It waits for all four samples or fails; it never substitutes stale counters. The two live probes, maximum-count comparison, zero-error requirement and revision check remain unchanged. It adds no allowance.

| Cost | Application change |
| --- | ---: |
| Draws, triangles, shader instructions, texture taps | 0 |
| Game-source changes | 0 |
| Gate recorder allocation | Four two-number tuples per probe |
| Hook after four samples | Delegation and a limit check until stopped |

The recorder preserves the meter's receiver, arguments, return value and exceptions, and restores its original method when stopped. Regression tests exercise repeated stale counters, completed-frame maxima, the four-frame bound, invalid data and nested-hook restoration. #673 separately fixes the shot-mode title-screen startup wait; this change does not duplicate it.

Software measurements do not establish Apple GPU performance or a hardware frame-pacing PASS.
