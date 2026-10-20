# Diagonal tree placement bounds

Runtime head `2f2d83c27acc937d271553277e49f8d64fe473ac`; published baseline 0.0.33 · b317734. The old rotated source rectangle includes empty corners. Cardinal and diagonal support planes form a tighter horizontal envelope around every LOD's source vertices. Transform it once per immutable placement, preserve the old vertical interval and complete two-metre per-axis wind guard, and intersect with the old box. Non-upright/projective transforms retain the old box. Spheres, matrices, geometry, materials, wind, shaders and LOD intervals are unchanged. No new per-frame source scan, buffer or envelope construction.

This reduces off-screen submitted geometry. It does not repair static detached crowns or the shared LOD-mask problem.

## Actual-helper normal-motion replay

The committed helper runs over retained native High templates and placements. Every guarded source vertex is verified across all 451 placements and three LODs; 851,873 template vertices are scanned. Normal wind is explicit: Reduced Motion false, foliage strength 1, native wind settings 0.16 / 0.42. Captures hold wind clocks at 3 seconds. An initial default-shot acquisition was stopped because it disabled motion; its partial images are not used.

All nine before/after/restored native post/MSAA triples are RGB-identical, independently checked from the saved PNGs. First five are adjacent walk samples, then forest turn and sea, then the largest reductions from a separate 32-heading counter-only scan at two forest positions. All camera poses and full counter scope are in the raw report. These are controlled same-pose images, not a gameplay-cadence motion clip. Planar-reflection caches are invalidated per render; not every pose invokes a fresh planar capture and no all-window-cubeface refresh is claimed.

| Pose | Draws before → after | Triangles before → after |
| --- | ---: | ---: |
| 0 | 456 → 456 | 6242951 → 6156409 |
| 1 | 417 → 417 | 6142168 → 6024762 |
| 2 | 418 → 418 | 6186277 → 6052415 |
| 3 | 419 → 419 | 6201033 → 6071450 |
| 4 | 418 → 418 | 6200649 → 6071066 |
| 5 | 314 → 311 | 5114280 → 5005970 |
| 6 | 738 → 738 | 10335587 → 10333379 |
| 7 | 393 → 393 | 6423639 → 6267863 |
| 8 | 420 → 420 | 7461756 → 7372774 |

One helper-construction observation is 11.7 ms across templates, extra load-time work. It is not a total loading-time delta or benchmark. The earlier stopped acquisition observed 26.4 ms, demonstrating that this cold helper measurement varies. Source vertices are not copied or sorted.

## CPU confirmation and uncertainty

Actual native forest module updates (including floor/falling leaves) run against precomputed walking/turning cameras at 2.6 m/s, 60-Hz steps, yaw +0.003/step. Sun volume and clocks are fixed; dt is zero. Camera construction/matrix updates, other world updates and draws are excluded. Each acquisition uses nine rotated batches of 1,200 calls/mode, 240 warm calls per batch. Baseline B is unchanged-code control. The original image acquisition and all three fresh-world repetitions are retained, including the original p95 increase from 0.2 to 0.3 ms. Nothing is discarded. Per-call clock resolution is approximately 0.1 ms. Pooled results:

| Mode | Mean elapsed ms/module update | p95 ms/module update |
| --- | ---: | ---: |
| before | 0.156289 | 0.200000 |
| after | 0.155502 | 0.200000 |
| control | 0.157051 | 0.200000 |

All three fresh repetitions report 0.2 ms p95 in all three modes. Their mean variations remain inside the A/A range; no CPU speedup is claimed. Pooling every sample from all four acquisitions also gives 0.2 ms p95 in all modes. These are component timings, not full game frames, hardware GPU results, FPS or heat evidence. Consult the individual repetitions and raw samples rather than interpreting one quantized p95 step as an exact cost change.

## Real forest upload traffic, separate from timing

Actual WebGL bufferData/bufferSubData payloads are tagged by the forest instance matrix/colour/coverage ArrayBuffers. Warm one full path, exclude the closing jump, then measure 119 walking/turning frames. Draw/raster calls are suppressed; buffer transfers still execute. This is forest-owned buffer traffic, not whole-scene bytes, texture uploads or GPU draw time.

Before: 430,816 bytes / 1,337 calls, peak 19,784 bytes. Candidate: 427,984 / 1,337, peak 12,512. Unchanged-code control reproduces every frame's counters exactly.

## Regression and stock gate

32 focused tests and production build/typecheck pass. Replaying the original rectangular transform fails the empty-corner regression; all-LOD guard containment and fallback controls pass. The unmodified stock gate runs the actual compiled head, normal startup, no initialization script/allowance/sampler changes; actual exit 0. Sanitized stdout is included. `play-gate: PASS 2f2d83c27`.

The RGB acquisition replays the actual candidate helpers over the native published scene; it is not a separate compiled nine-pose comparison. The stock gate separately loads the compiled head. No hardware pace/heat claim.

## Reproduce

From the repository root:

```sh
node tools/repro-live-tree-footprint.mjs --url BUILD_URL --out proof
REPRO_INIT_FILE=docs/perf/TREE-DIAGONAL-BOUNDS-PROOF/raster-suppression-init.js node docs/perf/TREE-DIAGONAL-BOUNDS-PROOF/repro-uploads.mjs --out uploads
REPRO_INIT_FILE=docs/perf/TREE-DIAGONAL-BOUNDS-PROOF/raster-suppression-init.js node docs/perf/TREE-DIAGONAL-BOUNDS-PROOF/repro-cpu-repeat.mjs --out cpu-repeat
node tools/play-gate.mjs --url BUILD_URL --budget-url https://ael-dev3.github.io/Tervain/ --head 2f2d83c27 --tag tree-diagonal-bounds --out budget-proof
```

Use software-WebGL Chrome through CHROME. The stock gate must run with REPRO_INIT_FILE unset. The two supplementary scripts deliberately suppress raster for their stated upload/CPU scope. Run browsers sequentially.
