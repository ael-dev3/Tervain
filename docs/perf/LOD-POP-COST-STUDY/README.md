# Tree LOD mask cost: rejected repair pilots

Live source baseline: `b317734` (0.0.33). `distanceVisibility.ts` hashes each surface's world position and pixel footprint. Complementary numeric intervals do not guarantee complementary fragments when adjacent models have different depths or normals. High's default full intervals do not execute this partial fade; Medium and High with distance detail enabled do.

The existing #645 shared-radius repair is held. This study tests its actual material hook and a smaller perspective-only pilot that reconstructs the reference from normalized view position instead of viewport/projection uniforms. Neither is approved for production.

| Interval | Variant | Median elapsed query ms |
| --- | --- | ---: |
| Full control | before | 25.642 |
| Full control | after | 63.784 |
| Full control | viewraypilot | 43.992 |
| Partial | before | 25.129 |
| Partial | after | 61.144 |
| Partial | viewraypilot | 43.061 |

Each row contains seven warmed elapsed queries in alternating order: 128 overlapping opaque planes at 128 x 128, depth testing/writes disabled, one draw / 256 triangles, no texture samples. Partial intervals retain thousands of pixels; they are not accidentally empty. Full controls retain all 16,384 pixels. Zero console errors, fixed programs and equal draw/triangle counts are required. Readback/hashing happens after the elapsed query.

The smaller pilot remains about 1.7 times the baseline query time, including on the full-interval control. Dropping flat interpolation or the shared-reference fallback in separate preliminary pilots also did not recover the held repair's cost. Therefore no production change is offered. Software elapsed queries include a small submission interval; they are not Apple GPU timings, native forest frame times, or a pacing gate. The perspective-only pilot also lacks orthographic and full mask-correctness qualification: it must not be copied into production merely because its cost is smaller than #645.

Reproduce from the repository root with its installed dependencies and software-WebGL Chrome:

```sh
node docs/perf/LOD-POP-COST-STUDY/run.mjs lod-cost-study.json
```

`baseline.ts` is the exact b317734 file; `held.ts` is #645 source b8108d3bf. The pilot changes only the reference calculation and program key. These files are study fixtures, not game-source changes. The historical #645 mask oracle establishes the different-depth overlap problem; this cost run does not itself measure visible pop events on a walking route.

The native route is a baseline-only acquisition with explicit species, label, camera poses, build revision and repeated-render controls in its JSON. It is not before/after repair proof or a pop-event count. An earlier route obstructed by a foreground pine was rejected and is excluded.
