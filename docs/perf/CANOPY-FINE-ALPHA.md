# Retain fine opaque witnesses in canopy audits

The published 0.0.29 · bf9261f far-LOD alpha audit aborts with `Canopy alpha sampling missed opaque foliage`. A fine-grid probe has already found actual opaque coverage between the coarse samples, but the detector throws rather than including it. An aborted report is incomplete, not zero detached foliage.

The candidate retains those witnessed barycentric points in the existing UV-pattern cache. It keeps the same alpha cutoff and operation ceiling, charges every fine-grid lookup, preserves transparent/geometry-only controls, and does not cache a collapsed triangle as proof that a later real card is empty. It does not change rendered foliage, source geometry, materials or shaders.

## Reproduction

`node tools/repro-live-canopy-fine-alpha.mjs --baseline bf9261fae --url https://ael-dev3.github.io/Tervain/ --out canopy-fine-alpha-proof`

The driver runs original/candidate diagnostic source against the same full registered far-LOD population and real cutouts: `lod:2, alpha:true, gap:0.75, woodReach:1.5, maxOperations:300000000`. It restores native raster before the bracketing captures, captures the canvas before awaiting network activity, rejects cleared/blank captures, and requires pixel/cost equality, zero console errors and the same published revision.

This remains finite sample-grid evidence, not exact per-texel connectivity, wind-aware coverage or a visual-quality score. Alpha-mode `components`/`detachedCards` are sampled opaque triangle components, not directly comparable to the unmasked welded-card counts.

## Local checks

Two regression cases fail against the old helper. The candidate passes 28 focused tests and the build. Tests include supported/detached thin foliage, full transparency, geometry-only controls, collapsed-first UV patterns, repeated-pattern caching and operation-budget exhaustion. A repeated pattern samples alpha 28 + 1,225 times once, then reuses those weights.

## Published-build result

Original source aborts at the first missed opaque witness. Candidate source completes all **451** far-LOD targets, with zero missing wood, in **14,066,702** charged operations under the unchanged 300,000,000 ceiling. The resulting sample-grid report has 368,486 opaque triangle components, 79,157 beyond the sampled wood reach and 2,356 detached groups across 295 trees. These are diagnostic candidates requiring visual review, not confirmed floating objects or a quality score.

[Original incomplete result](proofs/canopy-fine-alpha/before-audit.json) / [complete candidate report](proofs/canopy-fine-alpha/after-audit.json) / [full receipt with source fingerprints](proofs/canopy-fine-alpha/report.json.gz).

The actual compiled `5d5a64fc3` application independently produces exactly the same report, including every target field and operation count. Its wrapper confirms 451 expected trees, complete species coverage and zero console errors: [compiled receipt](proofs/canopy-fine-alpha/compiled.json). Reproduce with `node tools/check-canopy-fine-alpha-build.mjs --url <candidate-build> --expected docs/perf/proofs/canopy-fine-alpha/after-audit.json --head 5d5a64fc3 --out compiled.json`.

## Native image and cost control

[Before audit](proofs/canopy-fine-alpha/before.png) / [after audit](proofs/canopy-fine-alpha/after.png): the published native world is unchanged, **zero changed channels**, **355 draws / 5,107,699 triangles** on both sides, zero console errors. This brackets diagnostic execution on the same frozen published app; it is not a two-binary image comparison. Camera and time are fixed; renderer counters and canvas pixels are captured synchronously before awaiting metadata. Native raster is restored before all retained images, and the driver rejects blank captures and non-positive counters.

| Cost | Delta |
| --- | ---: |
| Control-pose draws / triangles | 0 / 0 |
| Materials / geometry / uploads / texture taps / shader code | No rendering change |
| Per-frame JS work | No changed frame-update path |
| Explicit offline alpha audit | Completes the fine search; not a speed reduction |

Initial harness captures with a cleared framebuffer or reset counters were rejected and are not retained as proof. No hardware GPU, heat or 60 fps claim.

## Exact-head stock budget: PASS

Two published bf9261f probes and the compiled `5d5a64fc3ade961289e12809bee922855411078b` candidate, four distinct completed frames per probe: **285 draws / 3,048,306 triangles / zero console errors** on both sides. Revisions agree, candidate head matches, triangle allowance zero, exit 0. [Structured receipt](proofs/canopy-fine-alpha/native-budget.json). This is a different camera route from the native image-control pose above.

`play-gate: PASS 5d5a64fc3`

The page does not measure texture taps or JS CPU; the no-change table is based on the unchanged rendering/frame-update code. No hardware performance claim.

## CI dependency

CI build and software-WebGL pass. The inherited startup and completed-frame fixture failures in scenario shards 2/3 are repaired separately in #684. Overlaying that pending fixture repair with this candidate passes **41 tests in eight files**, then the fixture files are restored; this candidate's head contains only the alpha helper and its regression tests. The native budget head is unchanged.

