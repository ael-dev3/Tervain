# Shared foliage alpha footprint

Published `0.0.22 · bcb881c` evaluates the same UV footprint twice in the mapped
leaf alpha path: first for magnified cubic alpha, then for the mip-dependent
coverage lift. Each evaluation scales the same UV by the same texture size and
computes the same derivative lengths and logarithm.

The candidate retains the first LOD's nonnegative value for the later lift.
The first logarithm already has a `1e-8` safety floor. Below that floor both old
and new coverage LODs clamp to zero, including constant UVs. Above it the
expressions have the same operands. Filtering, alpha thresholds and sample
coverage stay unchanged.

Only the alpha block and its compile-cache key differ in runtime source:
[source identity and cost model](proofs/foliage-shared-footprint/source-budget.json).
The shared block serves the cutout/depth prepass; the shade-only pass excludes
that block. Geometry, material inputs, vertex code and per-frame JS are unchanged.

## Verification

**126 actual production-shader renders** compare both variants across seven cases
and nine subpixel translations: magnified leaves, minified leaves, the mip-zero
boundary, constant UVs, coverage-preserving mips, single-sample capture and unmapped
controls. All RGBA pixels match; every image contains visible geometry, and every
case draws two passes/four triangles.
[Fixture receipt](proofs/foliage-shared-footprint/fixture.json).

The published build was also replayed through its native High post/MSAA4 path at
640×360. Five synthetic 60 Hz walk/turn poses cover 0.173 m in dense conifers.
The two alpha blocks are substituted into the same production programs; scene
state, wind, cloud and film phases are held fixed. The sky/shadow focus uses the
physical player position. Full RGB images match at every pose, including restored
and original native controls. Each variant is warmed before measurement; shadow
maps are cached within each pair.

| Cost | Before → after |
| --- | --- |
| Draw calls | 280–285 → identical at every pose |
| Triangles | 5,224,983–5,316,424 → identical at every pose |
| Textures | 274 → 274 |
| Source upload bytes per measured render | 32,256 → 32,256 |
| Warm shader links | 0 → 0 |
| Alpha-source `log2` calls | 2 → 1 |
| Alpha-source `textureSize` metadata queries | 2 → 1 |
| Alpha-source `dFdx` / `dFdy` calls | 5 / 5 → 3 / 3 |
| Alpha-source dot products | 9 → 7 |
| Texture sampling instructions | unchanged |
| Per-frame JS / uniforms / varyings / passes | no additions |

These are GLSL **source** counts, not optimized ISA. A driver may already eliminate
the common expressions; register allocation and hardware time are unmeasured.
This is a pixel-identical foliage shader simplification, not a measured FPS gain
or closure of crown shimmer or the sustained 60 fps target.

- [Native receipt](proofs/foliage-shared-footprint/report.json)
- [Before](proofs/foliage-shared-footprint/before.png) / [after](proofs/foliage-shared-footprint/after.png)
- [Browser motion preview](proofs/foliage-shared-footprint/motion-preview.mp4)
- [RGB-lossless motion](proofs/foliage-shared-footprint/motion-lossless.mp4) / [decode verification](proofs/foliage-shared-footprint/video-verification.json)

Left before / right after. Playback is 6 fps, slowed from the synthetic source
cadence. The decoded lossless clip matches all source RGB frames byte-for-byte;
the lossy preview is not metric input. The native walk used the controller at
`507c2cd97`; subsequent controller changes add linked-program validation and an
optional pose count, preserving its default five-pose acquisition.

The 20 foliage tests and production build pass. Reproduce from this branch:

An additional check serves the **unmodified compiled candidate `507c2cd97`**.
All **31 linked native leaf programs** contain the shared-footprint assignment;
none contains the old duplicate UV footprint. Its original native image matches
the controlled image exactly, and its before/after/restored counts and pixels
also agree at the first forest pose. [Compiled receipt](proofs/foliage-shared-footprint/compiled.json),
[matching control image](proofs/foliage-shared-footprint/compiled-control.png).

Reproduce:

```sh
node tools/repro-foliage-lod-footprint.mjs fixture-proof bcb881c
node tools/repro-live-foliage-footprint.mjs --url BUILD_URL --baseline bcb881c --out native-proof
node tools/encode-foliage-footprint-proof.mjs native-proof
```

`BUILD_URL` can serve the published baseline or the candidate; the controller
checks the served foliage source, linked native programs, untouched native image,
and before/after/restored pixels and costs. It rejects unexpected source or console
errors and removes an old report before acquisition. No hardware pacing is inferred
from software WebGL.
