# Leaf-only packed forest bounds

Leaf colour and leaf-depth batches previously used a sphere enclosing the entire tree, including empty trunk/root space. A canopy fully outside the camera could still submit both leaf passes.

The candidate retains the original packed centre and subtracts only the minimum safe radial slack across all source leaf LODs and instance scales. The resulting sphere is contained in the old one, so it cannot admit extra draws. Every leaf vertex retains the same two-metre wind margin. Wood, shadow casters, geometry, shaders and instance packing are unchanged.

The slack is computed once per source batch; a sphere copy/subtraction runs only when the existing packed bound changes. There is no additional per-instance refresh walk or frame allocation.

Validation: mixed instance scales and rotations, wider reflection LOD, empty batch and outlying-source fallback; native High post/MSAA4 rendered comparisons with shadow updates. Software-renderer measurements establish command counts and image identity, not hardware frame rate.

## Rendered proof

Baseline: published **0.0.23 · 670b96d**, native High, 640×360, post-processing and 4× MSAA enabled. Five standard nearby forest camera poses are followed by the forest view at (-210, 0), yaw 3, pitch 0. Wind advances between poses and is frozen within each before/after/restored comparison. Shadow maps refresh normally. The probe applies the same production helper to the live build's actual packed spheres and all source leaf LODs, without changing source geometry, materials or packing. All 120 native leaf colour/depth bindings are exercised.

| Pose | Draws before → after | Triangles before → after | RGB changed components |
| --- | ---: | ---: | ---: |
| Standard 1 | 456 → 456 | 6,279,232 → 6,279,232 | 0 |
| Standard 2 | 417 → 417 | 6,178,449 → 6,178,449 | 0 |
| Standard 3 | 418 → 418 | 6,222,558 → 6,222,558 | 0 |
| Standard 4 | 419 → 419 | 6,237,314 → 6,237,314 | 0 |
| Standard 5 | 418 → 418 | 6,236,930 → 6,236,930 | 0 |
| Forest | 236 → 234 | 3,730,188 → 3,708,644 | 0 |

All six restored controls also match exactly. Upload bytes, texture count (274), and estimated texture storage (1,310,276,620 bytes) match within every pair; no console errors or unknown texture formats. The forest view saves **2 draws / 21,544 triangles**, including both leaf passes. There is no draw saving in the five standard views; those are image-safety controls.

[Complete measured report](proofs/leaf-only-bounds/report.json) includes the world positions, camera angles, wind phases, counters and RGB hashes. Each pose has full-resolution `pose-N-before.png` and `pose-N-after.png` in [the proof directory](proofs/leaf-only-bounds). Pose 5 is the forest view.

| Cost | Delta |
| --- | --- |
| Leaf shader / texture sampling per submitted vertex or fragment | 0; unchanged shader source |
| Geometry / instance count / packing | 0 |
| Per-frame allocation | 0 added |
| Unchanged packed bounds | 0 added work |
| Changed packed bounds | One retained sphere copy/subtraction per changed batch/LOD; no additional per-instance walk |
| Construction | One leaf-vertex scan across all source LODs per batch; three retained spheres per batch |
| Hardware GPU time / Mac FPS / frame CPU timing | Not measured; no timing or heat claim |

The unmodified deterministic compiled-head budget gate is run separately. Its exact-head receipt is attached to the PR; this document does not claim a pending gate passed.

Reproduce: `CHROME=<Chrome executable> node tools/repro-live-leaf-bounds.mjs --url https://ael-dev3.github.io/Tervain/ --out artifacts/leaf-bounds`. Requires the baseline forest batch layout; the probe fails if RGB differs, a restored control moves, draws/triangles increase, no triangles are saved, console errors occur, or software rasterization is suppressed. It tests the production helper loaded from source; the compiled-head gate additionally checks production wiring and revision.
