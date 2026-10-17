# Raised coarse-LOD root seating

The published oak `tree:wild:40:42` has different woody base heights across its source LODs: near **0**, middle **0.096 m**, far **0.264 m** in model space. Flare grounding clips all levels at the same absolute local height, 0.35 m. It therefore misses part of the coarse model's basal flare, leaving an actual gap above the native terrain.

Include the lower 0.35 m above each raised woody LOD base, while preserving the existing band for zero/negative bases. The existing terrain-facet grounding solver then seats the whole tree once. No vertices are reshaped, no per-LOD camera-dependent seat is introduced, and the 0.06 m soil overlap and 1.5 m maximum flare sink remain unchanged. Materials, scale, yaw and canopy shape are untouched; the visible position changes only through the grounding correction.

This change is stacked on **#534**, which recalculates navigation radii using final seated height. That dependency keeps navigation bounds consistent with the corrected tree pose.

## Native published-build replay

```sh
node tools/repro-live-raised-lod-roots.mjs --out raised-lod-root-proof
```

The script defaults to [published Pages](https://ael-dev3.github.io/Tervain/), retains the actual oak's three woody source models and placement, and runs the exact original/candidate grounding functions against the native terrain. The original solver reproduces its native Y exactly. Compare every vertex in each model's lower 0.35 m band, and verify the original source position/index hash stays unchanged.

The root inspection renders the actual far woody model in isolation on native terrain, with native material and post/MSAA rendering, at an identical fixed camera before/after. It does not fabricate or replace the root geometry. Other forest trees are hidden for inspection; these are diagnostic stills, not a full-scene walk-through or hardware gate.

Input **0.0.18 · 421d34b**, oak near world X/Z **(-126.3, 98.9)**:

| Metric | Original | Candidate |
| --- | ---: | ---: |
| Whole-tree Y | 0.19859 m | -0.02671 m |
| Near basal-band worst gap | -0.06774 m | -0.29304 m |
| Middle basal-band worst gap | +0.00772 m | -0.21759 m |
| Far basal-band worst gap | **+0.13055 m** | **-0.09475 m** |
| Draw calls in root inspection | 112 | 112 |
| Triangles in root inspection | 753,959 | 753,959 |

Negative gaps are overlap below terrain. The same **0.22530 m** downward correction applies to the whole tree at every LOD. All **671 sampled basal-band vertex records** and every source woody position/index buffer remain accounted for; this is one native-tree proof, not full-forest clearance or an art score.

[Before still](../../proofs/raised-lod-roots/before.png) · [after still](../../proofs/raised-lod-roots/after.png) · [structured receipt](../../proofs/raised-lod-roots/report.json) · [unchanged-source control](../../proofs/raised-lod-roots/unchanged-source-control.json).

```sh
node tools/repro-live-raised-lod-roots.mjs --candidate-ref 421d34b --out raised-lod-root-control
```

The unchanged-source control must exit 1 (`pass:false`): it retains the positive far-root gap and cannot satisfy the correction assertion.

## Validation and limits

Two regression tests fail on original grounding source. The stacked head passes **26 grounding/forest-integration tests and production build**. Tests retain zero-based seating, the maximum-sink cap and unchanged source buffers. Full live/video/hardware acceptance remains required before shipping; no claim is made that every tree, detached crown, sparkle issue or Mac performance target is fixed.
