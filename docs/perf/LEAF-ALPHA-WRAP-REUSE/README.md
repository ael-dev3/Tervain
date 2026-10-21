# Reuse wrapped bilinear leaf-opacity coordinates

Candidate `ae789ac3c2313ba59783cdb6b9ad0623908d26c2`, published source base `3596f1e8b` (0.0.39). The CPU cutout sampler evaluated the same four wrapped row/column coordinates twice per bilinear map lookup. Reuse them, retaining the same texel reads, division and interpolation ordering. Nearest-filter sampling is unchanged. No authored geometry, threshold, shader, texture, palette or style changes.

## Reproduction and deterministic cost

The complete native High source world built twice sequentially. The source base matches the published revision. Both builds use the normal constructor and subsequent twig/support work. A counter in `wrappedPixel` records **40,577,808 → 20,329,356 calls** before the proof audits, a reduction of **20,248,452 (49.90%)**. This includes setup consumers of this CPU helper, not GPU texture taps or per-frame JS work. The instrumentation adds overhead; it is not used for timing. All **60 leaf source geometries** across near/mid/far have identical SHA-256 attribute/index hashes. Full near alpha audit results also match: 451 trees, 53 isolated candidates, 5,023 broad distance clumps. This PR does not repair those remaining flags.

The regression fails on original code (8 coordinate clamps, expected 4) and passes on candidate. Exact alpha comparisons cover nine S/T wrap pairs, both texture orientations, transformed UVs and negative/outside UVs. **22 focused tests and build pass.**

## CPU helper timing

Three fresh V8 test processes, each warming all modes then rotating 30 blocks/mode, 65,536 alpha samples/block. This is a small synthetic repeat-wrapped 128×128 atlas workload, **not native whole-frame timing, GPU time, Apple hardware, heat or the historical ~33 ms stall cause**. Each mode's sample sum is identical. p95 is a percentile of block durations, not frames.

| Mode | Mean ms / 65,536 samples | p95 block ms |
| --- | ---: | ---: |
| before | 2.9563 | 3.0262 |
| after | 1.2670 | 1.3249 |
| control | 2.9606 | 3.0241 |

## Normal native rendering

Two independently loaded full worlds, same five cameras, High 640×360 DPR1, frozen time/wind, normal post/MSAA, explicit sky/cloud and gust phases, rebuilt shadows and invalidated water reflection before each render. Raster is explicitly restored/asserted before images. Both repeats per mode and all original/candidate pairs are RGB-identical: **20 PNGs, zero differing pixels**. Load-only raster suppression is optional for setup; never used in the compiled stock gate. Costs below are equal on each side; their absolute counts differ from the stock fixed-placement route.

| Pose | Draws (each) | Triangles (each) | Changed RGB pixels |
| --- | ---: | ---: | ---: |
| fir-overview | 816 | 11,611,430 | 0 |
| fir-lower | 294 | 4,232,436 | 0 |
| fir-upper | 294 | 4,180,394 | 0 |
| fence-control | 638 | 7,129,819 | 0 |
| sea-control | 244 | 1,881,379 | 0 |

No draw/triangle/upload/shader cost increase; no per-frame repair work introduced. This cuts CPU sampling work during loading/audits and does not establish a per-frame or 60 fps improvement. The stock unmodified compiled budget passes on the exact head, default thresholds, no allowance or sampler changes: [receipt](budget.txt). The receipt's placement is not a woods-walk hardware timing trace.

Reproduce from candidate checkout with dependencies and configured Chrome: `node tools/repro-leaf-wrap-native.mjs [output-directory]`; `node tools/repro-leaf-wrap-cpu.mjs [output-directory]`. Fetch pinned base when shallow. Native replay runs two browsers sequentially; CPU driver creates/removes private fixture files and refuses existing ones. Raw counters, all geometry hashes, audit and paired images are retained.
