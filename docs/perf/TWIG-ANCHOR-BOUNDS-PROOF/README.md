# Bound leaf-to-twig grid searches

Runtime head `8954f33ff2e74f4772ca87f479b8514601599204`, based on published **0.0.34 · d2c8327**. This is a tree-construction CPU cost fix, **not a static detached-crown repair, measured frame-time improvement or Mac heat result**. Remaining crown quality stays open.

## Cause and change

For every leaf card, deriveBranchLeaf searches a full cube around its nearest-wood radius to find a sampled twig. It probes many empty cells outside the entire twig grid. Record the sampled cell bounds once and intersect each query cube with them. Keep the original xyz cell ordering, sample insertion order and strict-distance ties. Outside the packed key's unique coordinate range, retain the original traversal because out-of-range coordinates can alias. Geometry, shaders, materials, branch fields, per-frame code, texture taps, uploads and payload sizes are unchanged. This is separate from #726: that bounds the wood-vertex query; this bounds the subsequent leaf-to-twig Map search.

## Failing-on-old regression and fixture work

One leaf card near a long twig previously makes **79,564 Map reads**; the new regression requires fewer than 10,000 and checks the resulting branch attributes. It fails on old code and passes here. All **36 focused tests** and production build/typecheck pass.

A paired representative fixture run invokes the pinned old and actual current helpers against the same branch fields and geometries. Across 20 calls (birches, supplied oaks, fir and shore pine, all available LODs), twig-grid Map reads including grid construction fall **18,348,757 → 6,217,367** (66.1%). All generated wind/pivot hashes and all returned anchoring results match exactly. These are texture-stripped fixture inputs retaining delivered positions/indices/UVs, not a claim about the full published population's lookup count. The conifer/no-twig controls remain unchanged. Raw per-call counts/hashes and a reproducible paired test are included.

## Actual full construction and warmed CPU

An instrumented development build invokes pinned baseline and candidate deriveBranchLeaf on every actual construction call, comparing all attributes and indices with Object.is. **34 calls, 341,937 leaf vertices and 170 attribute arrays match**. The captured candidate source equals the runtime head's source byte-for-byte. Native acquisition uses the candidate source in the development build, not the compiled stock-gate page.

Retain those real construction inputs and replay the 14 cases with twigs. Warm three full batches for each of baseline, candidate and unchanged-baseline control; then run nine rotating rounds of those three uninstrumented helpers. Every mode performs the same clone/dispose work and yields the same checksum. Candidate is faster than both controls in every round. Mean elapsed time per complete helper batch **1,068.36 → 709.31 ms**, unchanged control **1,058.10 ms**; empirical batch p95 **1,325.9 → 848.0 ms**, control **1,118.1 ms**. Raw order/samples are retained. These are **isolated construction-batch timings**, not per-frame p95, whole-world loading time, hardware GPU time or FPS. Timing varies; no exact whole-load saving is inferred.

## Pixel controls

Seven normal-wind native post/MSAA poses at 640×360: five adjacent forest walk poses, forest turn and sea. All three RGB images per pose match exactly, independently decoded with hashes. These are repeatability controls on construction output whose old/new attributes were directly compared, **not separate baseline/candidate compiled-world screenshots or a real-time walk clip**. Wind clocks are fixed at three seconds with reduced motion false and strength 1. Reflection caches refresh per render; not all window cube faces are claimed.

At the first pose the cold setup render is 417 draws / 6,107,075 triangles; unchanged after/restore are 414 / 6,107,072. This setup difference is not claimed as a saving. Subsequent controls are retained in the raw report. Exact construction output is the appearance contract.

## Unmodified compiled budget gate

| Cost | Live → candidate |
| --- | --- |
| Maximum draws | 285 → 285 |
| Maximum triangles | 3,048,306 → 3,048,306 |
| Console errors | 0 → 0 |
| Per-frame JS / shaders / texture taps / payload size | unchanged |
| Isolated helper-batch mean | 1,068.36 → 709.31 ms |
| Isolated helper-batch p95 | 1,325.9 → 848.0 ms |

Normal startup, no initialization script, sampler changes or allowances; actual exit zero. **play-gate: PASS 8954f33ff**. No resolution or quality reduction.

## Reproduce

From repository root, select software-WebGL Chrome with CHROME and run browsers sequentially:

```sh
REPRO_INIT_FILE=docs/perf/TWIG-ANCHOR-BOUNDS-PROOF/raster-suppression-init.js node docs/perf/TWIG-ANCHOR-BOUNDS-PROOF/repro-native-construction.mjs
npx vitest run tests/presentation/twigAnchorSearch.test.ts tests/presentation/branchWind.test.ts tests/presentation/canopy.test.ts tests/presentation/meshyTrees.test.ts
npm run build
node tools/play-gate.mjs --url BUILD_URL --budget-url https://ael-dev3.github.io/Tervain/ --head 8954f33ff
```

PROOF_OUT selects native output. Loading raster suppression is restored before images; leave REPRO_INIT_FILE unset for the stock gate. For the standalone paired fixture count, copy repro-work-counts.test.ts to tests/presentation/twigGridProof.test.ts (where its fixture-relative imports resolve), run `npx vitest run tests/presentation/twigGridProof.test.ts`, then remove that temporary test. TWIG_GRID_PROOF_OUT selects its output JSON file. The fixture test pins baseline d2c8327 and uses the current checkout as candidate. Runtime source hashes and baseline pin make comparisons reviewable.
