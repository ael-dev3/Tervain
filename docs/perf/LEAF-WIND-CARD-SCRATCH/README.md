# Leaf branch-wind scratch reuse

Candidate `8e9cdaf9022447103c80469dacd09e4c037e2879`, base released 0.0.41 source `4749be770789a6d6a0477e3d7890b2e961ac231f`. `deriveBranchLeaf` keeps two vectors and a record for every connected card, only to broadcast them into the final vertex attributes. Use one shared vector pair and store each computed component's values at its union-find root in the final arrays; a set tracks completed roots. No new per-vertex buffer, geometry/attribute values, search order, anchor, flutter, threshold, shader or per-frame code changes.

## Deterministic allocation and output proof

The native High world performs **34** actual calls, including rendered and placement-footprint variants, with **82,326** cards. Source-level vector-constructor requests fall **164,720 → 136**, retained card records **82,326 → 0**. Set entries remain; this does not eliminate every allocation, measure actual GC events, or imply those objects all reach the heap after JIT optimization. It is a loading allocation reduction, not a floating-crown repair, a world-load speed measurement, or a steady-state frame/heat win.

The scoped constructor regression creates 96 cards with roots visited after the first vertex and one missing anchor. Original **98 Vector3 / 96 Vector4** constructors fail the expected **3 / 1**, while the complete wind/pivot hash matches. Candidate passes. Resetting the shared default wind W to one preserves the original missing-anchor case. Sixteen relevant tests and production build pass.

A proof-only source wrapper runs both algorithms on every actual native leaf/field input before installation, compares the complete anchored ratio and every wind/pivot element: all 34 equal. It also records geometry/twig fixtures for the separate CPU tool. Dual preparation work is not timing evidence. Each input's complete output hash is in [native-output-hashes.json](native-output-hashes.json).

## Warm helper CPU

Three fresh warmed V8 processes, three warmups then twelve rotating calls per fixture/mode/process, 34 geometry fixtures: **1,224 measured calls per mode**. Every output is checked against its native output hash. The tool reconstructs both possible branch-field shapes outside timing and requires an exact native-hash match, rather than assuming a broadleaf field for conifers. Cloning inputs is outside the measured interval; GC effects can still enter it. An unchanged original-code control is retained.

| Mode | Calls | Mean helper ms | p95 helper ms |
| --- | ---: | ---: | ---: |
| before | 1224 | 16.040 | 52.713 |
| after | 1224 | 15.956 | 52.444 |
| control | 1224 | 15.930 | 52.654 |

**No meaningful CPU speedup is established:** changes are comparable to the unchanged control. This mixed-template helper distribution is not a per-frame JS CPU measurement or hardware GPU result. The deterministic constructor reduction is the benefit. Full per-fixture results and all three raw sets are retained.

## Render and budget proof

One native High world uses the already element-equal wind attributes for each mode. Normal post/MSAA raster is restored/asserted after loading; fixed scene state, rebuilt shadows/reflections, two repeats per mode. **28 PNGs are RGB-identical** on five standard views plus two wind phases; the phases differ by **155,963 RGB pixels**, so the moving-state checks are not frozen-wind copies. Later geometry clones inherit the same values. This is output equality, not two independently timed load sequences or a motion-quality fix.

| Pose | Draws each | Triangles each | Changed RGB pixels |
| --- | ---: | ---: | ---: |
| forest | 822 | 11573288 | 0 |
| fence | 644 | 7104866 | 0 |
| run-round | 253 | 2218496 | 0 |
| bow | 300 | 2728220 | 0 |
| village | 587 | 5509880 | 0 |
| forest-wind-1 | 822 | 11573288 | 0 |
| forest-wind-2 | 822 | 11573288 | 0 |

[Unmodified stock compiled budget receipt](budget.txt) is on the exact candidate head, no allowances or init hook. It compares against the current published release; native source/render evidence above stays pinned to 0.0.41, separately from any newer live gate revision. No shader/tap/texture/upload or steady-state JS delta is introduced by this load-only change. Stock Retina DPR2 sampling and 640×360 native images have different absolute counts. Software WebGL is not a Mac hardware pacing measurement. Historical live16 33 ms frames remain open; no 10/10 claim.

Reproduce: fetch the pinned baseline if shallow, install dependencies/configure Chrome, run `node tools/repro-leaf-wind-scratch-native.mjs [output-directory]`, then `node tools/repro-leaf-wind-scratch-cpu.mjs [cpu-output-directory] [native-output-directory/fixtures.json]`. Native inputs are generated from repository assets by the first tool rather than duplicated as a large fixture here. The CPU tool removes its temporary helper/test files in `finally`. Run CPU and browser checks sequentially.

## Separate read-only root check

The live 0.0.41 survey checks actual near-wood vertices with local Y ≤0.35 across 451 placements. All 179 fir, birch, oak, palm, shorepine and orchard placements have no positive such gap; their worst vertices are already at least about six centimetres under terrain. This does **not** certify polygon interiors, all LODs or visible root quality. Pines/shrubs deliberately use a different seating policy and low branches are legitimately above terrain; their positive vertex distances are not labelled floating roots. No placement change was made. Raw survey and a read-only tool are included; labels are those supplied by that live build.
