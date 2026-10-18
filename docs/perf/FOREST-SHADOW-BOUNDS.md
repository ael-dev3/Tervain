# Cull forest shadow batches with cached visibility

Tree selection preloads the sun volume using the combined wood/crown envelope across all LODs. Separate wood/leaf shadow batches can lie fully outside the shadow map, yet still submit their geometry. The morning forest case sends nine such draws and 47,385 triangles.

Cache immutable per-placement caster envelopes from repaired geometry, retaining the existing two-metre wind guard. Union only the active packed prefix when it changes. Cache visibility against a reference sun volume padded by one metre; refresh the reference before its plane drift exceeds that margin anywhere in the authored realm. This also bypasses the ordinary refresh delay when needed. The renderer needs no additional per-frame caster frustum tests.

Geometry, attachment, wind, instance selection, coverage and shader/material code are unchanged. The 86,592-byte numeric cache is CPU-only; packed spheres and the reference volume are also retained. No frame allocations or refresh-time placement transforms are added.

## Seven native rendered comparisons

Published baseline **0.0.24 · 77d489b**, native High post/MSAA4 at 640×360. Shadow maps refresh during every render. Five standard forest camera poses plus morning/dusk shadow-edge views. The same production cache/bounds/visibility helpers run against the published geometry, placements and active instance transforms. Raster drawing stays enabled.

| View | Draw calls before → after | Triangles before → after | Changed RGB components |
| --- | ---: | ---: | ---: |
| Standard 1 | 455 → 455 | 6,129,258 → 6,129,258 | 0 |
| Standard 2 | 416 → 416 | 6,028,475 → 6,028,475 | 0 |
| Standard 3 | 417 → 417 | 6,072,584 → 6,072,584 | 0 |
| Standard 4 | 418 → 418 | 6,087,340 → 6,087,340 | 0 |
| Standard 5 | 417 → 417 | 6,086,956 → 6,086,956 | 0 |
| Morning | 304 → 295 | 3,249,515 → 3,202,130 | 0 |
| Dusk | 284 → 283 | 3,300,803 → 3,288,803 | 0 |

All seven restored controls are exact. Texture count remains 274; source-upload bytes match in each pair; zero console errors. Morning saves **9 draws / 47,385 triangles**; dusk saves **1 draw / 12,000 triangles**. The five standard views save no draws. This removes off-map vertex submissions, not measured fragment overdraw.

[Full rendered report](proofs/forest-shadow-bounds/rendered.json) and [full-resolution pairs](proofs/forest-shadow-bounds); morning is pose 5, dusk pose 6.

## Warmed paired renderer-thread CPU

Source baseline `617a5ae` is the same game code as live `77d489b` (release differences are version/docs). Each cohort has three runs of 120 warm pairs and 120 measured balanced pairs; all 360 measured pairs are retained. Actual forest refresh kernels plus warmed High renderer, including the added reference-volume drift check and changed bounds. The CPU-only probe suppresses raster draw entrypoints; images and the budget gate never use that suppression.

| Cohort | Before mean / p95 | After mean / p95 |
| --- | ---: | ---: |
| Candidate pooled | 2.431 / 3.892 ms | 2.392 / 3.883 ms |
| Identical-code A/A pooled | 2.560 / 4.177 ms | 2.521 / 4.111 ms |
| Candidate run 1 | 2.499 / 3.898 ms | 2.390 / 3.647 ms |
| Candidate run 2 | 2.257 / 2.998 ms | 2.320 / 3.553 ms |
| Candidate run 3 | 2.536 / 4.333 ms | 2.468 / 4.067 ms |

**No demonstrated CPU speed-up:** the pooled mean shift is about the same as the identical-code control. Candidate pooled p95 is nearly flat; one run's p95 increases. The A/A runs also move in both directions (up to 0.786 ms in per-run p95). Every paired candidate draw/triangle count is no higher; texture counts match. [All candidate samples](proofs/forest-shadow-bounds/cpu.json) · [all A/A samples](proofs/forest-shadow-bounds/cpu-aa.json).

The camera moves 4.3 m and turns 0.357 rad; hero and sun stay fixed. A common unmeasured render warms camera-dependent reflection capture before each pair without advancing either refresh kernel, so changed-bound work remains timed. An initial unmatched capture protocol failed its draw-count assertion and was rejected. Thread CPU excludes GPU work, draw-driver CPU, scheduler waits, and other world modules. This is not whole-game FPS or hardware/Mac timing.

## Regression and cost limits

- Packed vertices retain the wind guard at mixed scales/rotations; removing a tail shrinks bounds; empty batches remain empty.
- Stable packing does not rebuild bounds. Reference drift refreshes before a cached rejection can become unsafe.
- A 400-update moving-sun integration test checks that no intersecting packed batch is hidden. Disabling reference-drift refresh makes it fail; the restored implementation passes.
- Changed packing adds cached sphere unions. Steady frames add a six-plane reference-drift check; visibility tests run on changed packing/reference rather than every render.
- Shader instructions/texture samples per submitted vertex/fragment, GPU geometry/buffers/textures: unchanged.
- Construction recomputes source spheres and creates the CPU placement cache. No hardware GPU, heat or FPS improvement is claimed.

The unmodified compiled-head budget gate is separate; its exact-head receipt is attached to the PR after completion.

Images: `CHROME=<Chrome executable> node tools/repro-live-shadow-bounds.mjs --out artifacts/shadow-bounds`.

CPU: `REPRO_INIT_FILE=tools/repro-renderer-cpu-init.js CHROME=<Chrome executable> node tools/repro-shadow-bounds-cpu.mjs --out artifacts/shadow-bounds-cpu`; add `--aa true` for the identical-code control.
