# Reject camera-crown cores outside the boom path

Published **0.0.33 · b317734** contains 451 camera crowns. The current helper walks a boom in 20 cm steps even when a nearby crown is horizontally disjoint from the entire segment. A conservative X/Z bounds check skips those impossible intersections, retaining the original sampled path at tangencies and rounding boundaries. Bounds are computed lazily after the existing vertical rejection. No camera curve, geometry, material or look setting changes.

[Full report](report.json) · [synthetic baseline-failure control](negative-control.json).

## Reproduction and controls

```sh
node tools/repro-live-crown-horizontal.mjs output
```

The unchanged CameraRig source is linked to each actual baseline/candidate crown helper and compared with the published controller constructor. Counters are re-exported by that same Rig module; the probe verifies 600 actual linked-helper query records. An earlier pilot read a separate Vite module instance and is invalid; none of its counters or timings are included.

Five routes run 120 fixed 60 Hz follow updates each: terrain-following walk, turn and look-up sweeps. All camera positions, quaternions, boom lengths, body visibility, FOV and native viewport aspect match exactly across published/baseline/candidate. The two extra routes derive from an actual low crown in the live index; no test crown is inserted. Selected crown centre (-25.222545, 25.829839, -123.593325), horizontal radius 8.795855, vertical radius 9.090419, floor 18.855786. Its lateral path is x=-18.025654, z=-125.593325→-121.593325, looking away/toward at pitch 0.7.

The native endpoint captures use High, 640×360, post/MSAA4 and the native 16:9 projection. Motion/shake and prepared auxiliary captures are held for deterministic comparison; these are static endpoint proofs, not a real-input walking video or hardware pacing test. Each before/after/restored frame is RGB-exact, with equal draw/triangle counts.

| Route, 120 updates | Core tests before | After | Draws, both | Triangles, both | Images |
| --- | ---: | ---: | ---: | ---: | --- |
| fence | 0 | 0 | 121 | 2,374,666 | [before](fence-before.png) / [after](fence-after.png) / [restore](fence-restore.png) |
| forest | 0 | 0 | 83 | 751,507 | [before](forest-before.png) / [after](forest-after.png) / [restore](forest-restore.png) |
| grove | 11,492 | 4,644 | 140 | 1,923,431 | [before](grove-before.png) / [after](grove-after.png) / [restore](grove-restore.png) |
| native-edge-away | 17,770 | 6,817 | 145 | 1,845,054 | [before](native-edge-away-before.png) / [after](native-edge-away-after.png) / [restore](native-edge-away-restore.png) |
| native-edge-toward | 12,399 | 5,052 | 115 | 1,645,480 | [before](native-edge-toward-before.png) / [after](native-edge-toward-after.png) / [restore](native-edge-toward-restore.png) |

**Total core tests 41,661→16,513 (−60.36%).** Fence and forest-resume controls genuinely perform zero core tests on these routes, so no saving is attributed there. The normal grove route alone falls 11,492→4,644.

## Isolated CPU measurement

The timing arms import **uninstrumented** production helpers. They replay the 600 inputs actually captured inside the baseline helper (including its local corrected direction), with 50 warm batches and 20 balanced measured batches of 50 repeats. Every paired checksum matches exactly. All 40 timed arms are retained in the JSON; counter collection, rendering and CDP waits are outside the timing window.

| 30,000-query batch | Before ms | After ms |
| --- | ---: | ---: |
| Mean | 11.535 | 7.045 |
| p95 | 28.000 | 22.600 |

These are isolated JS batch timings in Chrome, **not frame CPU, GPU time, Mac FPS or heat**. The absolute saving per frame is small; no general hitch fix or 60-FPS claim is made. Added work is a lazy horizontal slab plus per-crown comparisons. There are no allocations, shader changes, new draws, triangle changes or uploads in the production fix.

76 focused camera tests and type-check/build pass. The 2,000-case sampled-reference test retains turns, inside pivots, floors and short booms. The baseline-failure control reads crown Y 34 times before vs 2 after, with identical boom output; the new no-sampling assertion therefore fails original code as intended. An initial build failed while duplicating public assets due to storage exhaustion; the successful build uses the same assets through links, with no repository configuration change.

[Exact-head stock budget](budget.txt): actual exit 0, zero triangle allowance, **285/285 draws, 3,048,306/3,048,306 triangles, zero console errors**, candidate `457972de5d1cb84737ed742a9f48f243379aafd1` against live `b317734`. Two same-revision live probes and four completed samples per probe; no raster-suppression preload in the budget run.

```text
play-gate: PASS 457972de5
```

CI remains pending at publication; it is not counted as passed. Floating foliage, the held long oak grafts, grass sparkle and general tree quality remain open.
