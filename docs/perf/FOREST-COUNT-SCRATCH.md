# Reuse count lists within a forest refresh

Related: #326 turning/streaming stutter and the [live build](https://ael-dev3.github.io/Tervain/). Published target: 0.0.18 · 421d34b. Hardware evidence in `LATEST.md` remains run live16; this does not replace it.

Every moving-camera forest refresh allocated two three-slot count lists for **each** tree batch. These counters are consumed synchronously before the next batch. Allocate one pair per refresh and reset it before each batch. No retained cache, geometry, LOD policy, culling rule, shader or draw-distance change.

## Reproduce

```sh
node tools/repro-live-forest-count-scratch.mjs --url https://ael-dev3.github.io/Tervain/ --out forest-count-proof
```

The script captures the published forest's actual batches and frame context. It executes the baseline/candidate refresh source, including their original packing/upload helpers, over 120 camera turns/walk updates along the fence route. Only the two count-list literals are instrumented to count constructions. Both runs start from restored native batch state and must independently match the native initial-state control.

For every update it compares active matrices, colors, LOD coverage, counts, visibility, bounds and forest counters. It also compares final native Grade/post pixels. The final draw is warmed twice before recording draw calls, triangles, texture count and buffer source-upload bytes. Texture count is not a GPU-memory-byte measurement. This Low-quality native replay verifies the color path; integration tests cover the other tree/shadow configurations.

Measured on 20 native batches over 120 moving-camera refreshes: **4,800 → 240 count-list constructions (95% fewer)**. Both native controls pass; all replay state hashes and final pixels match. The warmed final draw remains **255 draw calls, 1,313,876 triangles, 180 textures and 0 buffer-upload bytes**, before and after.

[Receipt](../../proofs/forest-count-scratch/report.json) · [before](../../proofs/forest-count-scratch/before.png) · [after](../../proofs/forest-count-scratch/after.png).

This counts JavaScript list constructions, not total heap allocation, GC duration or hardware frame time. It does not attribute live16's missed refreshes to these lists or claim a Mac frame-rate improvement. Tree appearance, root contact, shimmer and pop-in still need their separate visual gates.

Validation: production build; 25 selected forest/pine/Meshy integration tests pass. An initial parallel run hit the historical pine contact test's five-second timeout; the selected suite was rerun serially with the same assertions and a 30-second test timeout.
