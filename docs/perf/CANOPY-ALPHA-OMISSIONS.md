# Reject confirmed alpha-sampling omissions in canopy audits

The published canopy audit samples 28 barycentric points on each masked triangle (six subdivisions per edge). A thin opaque needle can fall between all those samples. The triangle then disappears from the diagnostic components even though its material sampler contains opaque coverage.

Add a bounded 48-step witness search when a nondegenerate triangle's coarse pattern is empty. A positive opaque witness rejects the audit explicitly instead of allowing it to omit that triangle. Fully unwitnessed patterns remain cached. Every additional witness query consumes the operation budget. Existing opaque and geometry-only paths retain their behavior; zero-area triangles are excluded from this new check.

The published island-anchoring path also uses a six-step alpha grid. That is a related sampling risk, not proof that every omitted triangle floats; repair geometry is unchanged here.

This is diagnostic correctness, not a foliage repair. No source geometry, material, placement or game rendering changes. It adds bounded offline audit work and does not improve gameplay FPS.

## Reproduce

```sh
node tools/repro-live-canopy-sampling.mjs --out canopy-sampling-proof
```

The default target is [the published game](https://ael-dev3.github.io/Tervain/). Baseline is [#517](https://github.com/ael-dev3/Tervain/pull/517), revision `9a5efa61a`; its alpha-pattern cache is reused here.

The tool visits masked conifer targets at all three retained Low-preset LODs, deduplicated by geometry identity per LOD. It excludes zero-area triangles and compares the existing six-step samples with positive 48-step witnesses. The census is bounded by `--max-alpha-queries` (default 20 million); exhausted queries produce an error, not a partial receipt.

For each affected geometry that has wood, it isolates one actual native triangle with its original UVs, cutout sampler, source wood and transform. Both actual audit versions run against that same input. Baseline complete/zero-component reports must become explicit sampling-omission errors. Opaque, transparent and geometry-only controls must retain the same completeness/component/candidate results.

The mask diagrams show native base-level sampler alpha in white above the material cutoff, blue coarse-grid points, and a red positive witness. These are diagnostic diagrams, not changed game textures. Native software-WebGL scene images before/after the read-only checks must match, along with draw/triangle/point/line counts. Frame identifiers are excluded from work comparisons, and counters are copied before asynchronous fetches.

## Limits

A positive witness proves the current grid missed opaque coverage. The absence of such a witness does not prove exhaustive texel coverage. Neither grid tests mip derivatives, alpha-to-coverage or shader wind. The census counts triangle occurrences in selected geometry targets, not floating islands or every planted tree. Far pine targets without separate wood remain a separate coverage problem. No whole-forest visual PASS or hardware timing claim is made.

## Recorded result

Published **0.0.18 · 421d34b**, Low preset, 15 retained conifer geometry targets across three LODs:

| LOD | Fir omissions | Shorepine omissions | Pine omissions (three geometries) |
| --- | ---: | ---: | ---: |
| Near | 117 | 117 | 0 |
| Middle | 91 | 91 | 0 |
| Far | 21 | 21 | 12 |

There are **470 confirmed omitted triangle occurrences** in this corpus. No zero-area triangles were included. These are not 470 floating clumps or a forest-wide tree count.

Six isolated native fir/shorepine triangles (one per affected geometry with wood) reproduce the audit defect: baseline **complete, zero components, zero candidates**; candidate **explicit alpha-sampling omission error**. A near-fir witness has alpha **0.4838** against cutoff **0.35** while all coarse samples miss it. Native far-pine sources without separate wood are included in the sampling census but excluded from those six complete-audit controls.

The opaque, fully unwitnessed-transparent and geometry-only controls retain their results. Native scene pixels remain identical: **245 draws / 1,889,302 triangles / 1,600 points**, unchanged. The census performs 5,646,307 alpha queries within its 20-million limit.

[Machine-readable receipt](../../proofs/canopy-alpha-omissions/report.json), [native scene](../../proofs/canopy-alpha-omissions/native.png), [after the read-only checks](../../proofs/canopy-alpha-omissions/after.png), [coarse samples on the native alpha mask](../../proofs/canopy-alpha-omissions/coarseMask.png), [positive witness circled](../../proofs/canopy-alpha-omissions/witnessMask.png).

**38 targeted tests and production build pass.** Regressions cover a thin missed needle, transparent/opaque/geometry-only controls, budget exhaustion, zero-area triangles and a collapsed first card followed by a real card sharing its UV pattern. Hardware play-gate verification remains pending.

The unchanged-source control retains all six false-complete zero-component results and correctly fails the regression gate. [Control receipt](../../proofs/canopy-alpha-omissions/unchanged-source-control.json).
