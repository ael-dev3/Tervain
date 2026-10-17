# Define the canopy-gap opacity ramp

Published repro: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/), native wooded view around oak `tree:wild:40:42`; related to foliage in [the playtest checklist](https://github.com/ael-dev3/Tervain/issues/326).

The leaf cutout uses `smoothstep(0.5, 0.27, tvClump)` to thin the canopy between clumps. GLSL leaves the result undefined when `edge0 >= edge1` ([smoothstep reference](https://registry.khronos.org/OpenGL-Refpages/es3.0/html/smoothstep.xhtml)). The published shader has that reversed-edge call in all 60 inspected native leaf-mesh hooks. This is a shader contract violation, not a measured visual failure on the software renderer.

Use `smoothstep(-0.5, -0.27, -tvClump)` instead. Negating the domain preserves the intended descending ramp while putting the edges in ascending order. The authored clump settings, geometry, alpha thresholds, wind, textures and lighting remain unchanged. The leaf program key changes so the old shader cannot be reused.

## Proof

The replay reads the actual native material hooks, checks the original expression is present, and overlays only the expression extracted from the candidate source. It captures the scalar ramp on software WebGL at 1,025 evenly spaced inputs from 0 through 1, checking complete writes, exact before/after equality and agreement with the intended descending Hermite curve. The pre-fix control retains invalid edges and must fail the correction assertion even though its sampled appearance is unchanged.

The full native wooded scene is rendered through its original post pipeline with zero and four samples. The four-sample control uses the same Low world geometry; it does not rebuild a Medium world. Geometry hashes and render counts must match. Screenshots are matched stills, not a player-motion or hardware-performance receipt.

| Check | Before | After |
| --- | ---: | ---: |
| Reversed-edge call sites across 60 inspected leaf-mesh hooks | 60 | 0 |
| Ramp samples | 1,025 | 1,025 |
| Inspection draw calls | 184 | 184 |
| Inspection triangles | 1,166,205 | 1,166,205 |

Maximum before/after ramp difference is exactly zero. Maximum error against the intended curve is 1.20×10⁻⁷ (float precision). Both zero- and four-sample full-scene images have zero changed channels. Geometry-buffer hashes match. The unchanged-expression control retains its reversed edges and returns `pass: false`.

[Before, zero samples](../../proofs/canopy-gap-ramp/before-0samples.png) · [after](../../proofs/canopy-gap-ramp/after-0samples.png) · [before, four samples](../../proofs/canopy-gap-ramp/before-4samples.png) · [after](../../proofs/canopy-gap-ramp/after-4samples.png) · [receipt](../../proofs/canopy-gap-ramp/report.json) · [pre-fix control](../../proofs/canopy-gap-ramp/unchanged-source-control.json)

## Reproduce

```sh
node tools/repro-live-canopy-ramp.mjs --out canopy-ramp-proof
node tools/repro-live-canopy-ramp.mjs --candidate-ref f2aac2e49 --images 0 --out canopy-ramp-control
```

The first command must pass; the second must fail. Defaults are live Pages and software WebGL. The control checks the parent revision's unchanged expression without rendering the image comparisons. This does not establish a root cause or improvement for grass sparkle, crown shape, floating leaves or missed refreshes. Hardware verification remains outstanding.

Validation: the compiled-shader edge-order regression fails before the fix; 33 foliage/bark/pine-integration tests and production build pass. Stacked on #582.
