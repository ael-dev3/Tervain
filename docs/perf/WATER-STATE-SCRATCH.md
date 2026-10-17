# Reuse water-pass visibility and layer snapshots

The water compositor mapped its water meshes and overlays into new layer-mask arrays each visible-water frame. Each moving-camera sea reflection also allocated visibility snapshots for water and excluded objects. These four short-lived arrays are avoidable per-frame work.

Keep four private primitive-value buffers on each `WaterRenderPass`, resize them to the current input lengths, and overwrite every slot before use. Draw order, visibility policy, capture cadence and restoration are unchanged. This removes the four explicit snapshot maps, not every allocation in the water path.

## Reproduce

`node tools/repro-water-state-scratch.mjs --baseline 421d34b --out water-state-proof` compares both actual pass implementations in native software WebGL. The fixture uses a simple capture-consuming water shader rather than the full ocean/world. It exercises 24 moving-camera frames, including growing and shrinking overlay/excluded-object lists.

| Measurement | Before | After |
| --- | ---: | ---: |
| Four tracked snapshot-map allocations across 24 frames | 96 | 0 |
| Native draw calls per frame | 7–8 | identical |
| Native triangles per frame | 53–65 | identical |
| Sampled before/after images | 3 | pixel-identical |
| Visibility/layer/target restoration failures | 0 | 0 |

[Receipt](proofs/water-state-scratch/report.json) includes every frame's counts, source hash and three image hashes. [Final native context](proofs/water-state-scratch/fixture.png). Both implementations have no GL error or context loss.

The 60-frame production-pass allocation regression fails on baseline with 240 snapshot maps, then passes with zero. All 36 water-pass tests pass, including capture-failure restoration and visibility controls; production build passes.

This is a bounded allocation reduction. It does not measure all JavaScript allocations, GC time, M5 hardware frame timing or the original night/mud boundary route. It does **not** prove the reported boundary hitch or live16 missed refreshes are gone.
