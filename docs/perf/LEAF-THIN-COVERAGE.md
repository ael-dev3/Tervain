# Repair thin foliage missed by coarse alpha sampling

The published 0.0.18 · 421d34b repair samples each leaf UV triangle on a six-step grid. Some opaque needle/frond patches lie entirely between those points. Those triangles never enter the component/contact graph, so the repair reports zero islands while leaving visible material unsupported.

Keep the existing path for triangles with coarse opacity. For empty UV patterns, run a cached 48-step positive-witness search. Retain every newly witnessed fine sample for support queries. A collapsed triangle cannot seed an empty-pattern cache entry that hides a later real triangle.

A conservative alpha-max hierarchy avoids dense searches for provably transparent UV triangles. It includes the existing texture transform, flip, filter footprint and wrapping behavior; wrapped edge cases keep the conservative fallback. The base alpha channel remains shared. Extra max levels are weakly cached by immutable decoded channel identity. No shader, palette, atlas or LOD policy changes are introduced; the existing repair now sees opacity it previously omitted.

## Reproduce

Run from the repository checkout:

```sh
node tools/repro-live-leaf-thin-coverage.mjs --out leaf-thin-proof
node tools/repro-live-leaf-thin-coverage.mjs --candidate-ref cb9a788d9 --out leaf-thin-control
npx vitest run tests/presentation/leafIslands.test.ts tests/presentation/leafSurfaceSites.test.ts tests/presentation/canopy.test.ts --testTimeout=90000
npm run build
```

The script defaults to the [live Pages build](https://ael-dev3.github.io/Tervain/). It reconstructs 17 native asset-backed variants from that build's immutable parsed templates (34 near/middle geometries), plus six retained procedural-pine controls. The parent repair must reproduce every published template byte-for-byte. Actual wood-triangle positions must also match the published wood. Instanced rendering attributes are excluded from the load-time geometry input.

It then compares a dense reference with the optimized candidate: every output attribute/index and repair result must match. Independent fine-grid queries measure changed opaque triangles against actual wood triangles. The candidate must fit the existing culling envelope and retain index counts. A controlled native-material, native-placement fir needle/wood macro supplies rendered evidence; a hidden-needle control verifies visible coverage. This is a macro, not a whole-crown walk clip. The unchanged-source control must fail.

The original implementation fails both focused thin-opacity regression cases. Supported, transparent and fully opaque controls pass. The bounds shortcut is checked across both filters, wrapping modes, flips, transforms and odd-sized images; it must never reject positively sampled opacity.

## Receipt: published 0.0.18 · 421d34b

[Report](proofs/leaf-thin-coverage/report.json) · [before](proofs/leaf-thin-coverage/before.png) · [after](proofs/leaf-thin-coverage/after.png) · [hidden-needle control](proofs/leaf-thin-coverage/empty.png) · [unchanged-source control](proofs/leaf-thin-coverage/unchanged-source.json)

| Measurement | Parent | Dense reference | Candidate |
| --- | ---: | ---: | ---: |
| Islands moved during fresh repair | 55 | 94 | 94 |
| Alpha lookups | 1,442,028 | 22,429,953 | 3,979,003 |
| Leaf vertices | 415,727 | 415,853 | 415,853 |
| Leaf attribute/index array payload | 16,041,624 bytes | 16,045,656 bytes | 16,045,656 bytes |

The candidate matches the dense reference in every output buffer and repair result. Four source/LOD templates change (fir and one palm, near and middle); other templates retain their output. Island counts describe this geometric repair, not a count of visually confirmed floating crowns.

The fir macro's opaque sample is **1.471 m → 0.480 m** from wood under the existing 0.6 m reach rule. It changes 5,446 image channels; hiding the original needle changes 2,505 channels. Both macro renders submit 19 draws / 87,013 triangles. Every template retains its index count and fits the existing sphere plus two-metre culling guard.

Repro location: tree root approximately **(89.93, 87.73)** in X/Z; the witnessed leaf is at **(80.085, 7.938, 95.379)** in world XYZ. The script selects its actual native placement and material automatically.

The alpha-max hierarchy constructs **8,388,606 bytes** of extra arrays for the six decoded atlases in this replay (base alpha channels are shared). It visits 291,493 max nodes; initial hierarchy construction reads 33,554,424 source/max values. These are CPU quantities. One instrumented pass including verification took approximately 3.70 s parent, 10.37 s dense reference and 4.93 s candidate across the 40 templates. The extra work occurs during the woodland loading phase, before the world is returned; this is not a per-frame search or a hardware loading benchmark. The cost remains material and needs hardware review.

The unchanged-source control exits 1: all three paths repair 55 islands and it finds no corrected native thin-opacity witness. Both focused thin-needle regression cases also fail on the parent.

## Limits and cost

The fine search is a bounded positive-witness improvement, not exhaustive texel/mip/wind coverage or a claim that every floating crown is fixed. Its repair policy remains the existing reach/gap rule. A macro is not a full-tree quality verdict; video and hardware review remain required.

This adds load-time CPU work and retained max-level data. It adds no per-frame search or triangles. Alpha lookup counts, hierarchy node visits and payload bytes are CPU diagnostic quantities, not GPU instructions, texture uploads or physical memory traffic. Instrumented one-pass construction timings are not hardware frame-time or full-load guarantees.


29 related tests pass; type-check and production build pass. Hardware/play-gate and full-crown video review remain pending. Related omission diagnostic: [#552](https://github.com/ael-dev3/Tervain/pull/552); playtest checklist: [#326](https://github.com/ael-dev3/Tervain/issues/326).
