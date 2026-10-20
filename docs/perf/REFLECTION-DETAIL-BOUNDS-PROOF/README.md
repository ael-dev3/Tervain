# Reuse reflection detail bounds

Runtime head `eb5cd096a239c2ae75abbb450214add8b52ed7c4`, based on published **0.0.35 · 15de8cc**; PR #734. This is a small planar-reflection selector CPU reduction, **not a crown repair, measured hardware FPS/heat result or closure of the historical 33 ms frames**.

## Reproduction and change

The actual published selector visits 361 retained detail meshes. A 15-call camera-only probe observes **333 sphere and 149 box transforms per call** with unchanged object matrices; hidden flags are restored after each call. Repeating those static world-bound transformations is redundant.

Cache only the transformed sphere and box, keyed weakly by the input matrix object. Snapshot both the local bound and matrix values and compare them each use. In-place position/scale edits, different matrices and edited/replaced local bounds recompute through the same Three method. Geometry, thresholds, shaders, materials, texture taps, uniforms, instance buffers and uploads are unchanged. Returned cached bounds are read by the selector; no culling policy changes. The cache adds per-object local/world bound and matrix records on cold use. Dirty updates reuse those records; weak keys do not retain removed matrix objects.

## Tests

The real selector is exercised for 60 camera-only steps on an underwater mesh. Old code fails: 60 transforms instead of one. The candidate computes once, then correctly changes the hidden result after the mesh moves above water. Additional tests compare exact direct-transform outputs through translation, rotation, nonuniform/negative scale, in-place local-bound edits and separate matrices. **38 focused tests and production build/typecheck pass.**

## Paired selector cost

Actual baseline and candidate selector methods run on the same retained native detail meshes, with equal camera paths and visibility restoration. Rotating baseline/candidate/unchanged-baseline order; three warmup batches per mode, then 12 samples per mode of 300 calls each. This is an isolated **selector plus equal bookkeeping** measurement with static object matrices, not per-frame whole-game CPU or GPU time.

| Cost | Baseline | Candidate | Unchanged baseline control |
| --- | ---: | ---: | ---: |
| Sphere transforms, 100 calls including cold use | 33,300 | 333 | 33,300 |
| Box transforms, same calls | 14,900 | 149 | 14,900 |
| Warmed elapsed/call mean | 0.02514 ms | 0.01567 ms | 0.02369 ms |
| Empirical p95 batch elapsed / 300 calls | 0.03933 ms | 0.01733 ms | 0.02433 ms |

Candidate is faster than both controls every round. The p95 is a **normalized batch percentile**, not a single-frame tail percentile; raw samples/order/checksums are retained. The approximately 0.0095 ms mean saving is small and must not be represented as resolving a 33 ms frame. Moving objects miss the cache when their matrices change; the static-object transform reduction is not claimed for every animated scene. Cold allocation time and hardware GPU cost are not separately measured.

## Native pixel proof

Two separate full worlds load pinned baseline waterRenderPass.ts and actual candidate sources. Seven static 640×360 post/MSAA poses: five adjacent forest views, forest turn with a planar capture, and sea. Time/wind are fixed for exact comparison. Two repeats each build: **all 28 PNGs match RGB within and across builds**, independently decoded using Pillow as well as Sharp. Draws, triangles and recorded reflection selections match for every pose. No proxy screenshot or manual visibility override is used for these images. Loading-only raster suppression is restored before images. These are static same-pose captures, not a walking clip or a hardware performance gate.

Baseline images were completed before a diagnostic-only TypeScript import correction; candidate acquisition resumed with strict source/pose pin checks. The default portable script below acquires both builds afresh. Source strings in the raw report match the runtime files.

## Unmodified compiled gate

| Maximum over sampled frames | Live → candidate |
| --- | --- |
| Draws | 285 → 285 |
| Triangles | 3,048,306 → 3,048,306 |
| Console errors | 0 → 0 |
| Geometry / shader taps / uploads | unchanged |

Two same-revision live probes; normal compiled startup; no initialization script, allowances, sampler edits or quality reductions; actual exit zero. **play-gate: PASS eb5cd096a**. The gate does not measure JS CPU or texture taps; the scoped CPU study and unchanged production shader sources are separate evidence.

## Reproduce

From repository root, choose software-WebGL Chrome using CHROME; run browsers sequentially:

```sh
npx vitest run tests/presentation/reflectionBounds.test.ts tests/presentation/waterRenderPass.test.ts
npm run build
REPRO_INIT_FILE=docs/perf/REFLECTION-DETAIL-BOUNDS-PROOF/raster-suppression-init.js node docs/perf/REFLECTION-DETAIL-BOUNDS-PROOF/repro-native.mjs
node tools/play-gate.mjs --url BUILD_URL --budget-url https://ael-dev3.github.io/Tervain/ --head eb5cd096a
```

PROOF_OUT selects native output. For a read-only published selector snapshot use repro-live-selector.mjs; its PROOF_OUT is a JSON filename. Leave REPRO_INIT_FILE unset for the stock gate. Keep source pins when comparing; a changed live deployment is a new baseline.
