# Mac budget (playtest 6)

## Target

A steady 60 Hz on a MacBook Air (Apple integrated GPU) at the **High** preset, with image quality no worse than now and the machine staying cool.

## Measured (live 0.0.14 · 0eedc51, benchmark route, 1440×900 at 2×, High)

Measured on an RTX 3080 Ti through `EXT_disjoint_timer_query_webgl2` (the game's own PerfMeter):

| | Median | p95 |
| --- | ---: | ---: |
| GPU per frame, 2× | **11.4 ms** | 16.7 ms |
| GPU per frame, same window at 1× | 7.2 ms | 11.9 ms |
| CPU per frame | 6.3 ms | 10.3 ms |
| Draw calls | 325 (max 739) | |
| Triangles | 3.8 M (max 9.9 M) | |

An Air's GPU has roughly a sixth to an eighth of this card's throughput. That projects to about 70–90 ms of GPU work a frame (about 12–15 fps) with the GPU pinned, which matches the heat and lag the playtester saw.

**Four times the pixels costs only about 4 ms of the 11.4.** Most of the cost is geometry: millions of triangles, drawn again into the 4096² sun shadow map. Grass, crowns and shadow casters are the first suspects.

## Budget

These apply on the gate machine, at the mac profile and the High preset. They should be checked on a quiet machine, with nothing else building or rendering:

| | Budget |
| --- | ---: |
| GPU median | ≤ 2.0 ms (about 12–16 ms on an Air) |
| GPU p95 | ≤ 3.0 ms |
| Draw calls, median | ≤ 250 |
| Triangles, median | ≤ 1.5 M |
| Frames over 25 ms | as in the play gate |

## How to measure

Serve the build, then run `tools/bench.mjs --headed --quality high --size 1440x900` with device scale factor 2. It reports CPU and GPU time per segment, draw calls and triangles.

Cuts must keep or improve the look. Each one should be shown with before/after GPU numbers per segment and the same capture from the visual gate.
