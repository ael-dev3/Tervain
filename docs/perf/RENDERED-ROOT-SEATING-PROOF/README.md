# Replacement-root terrain seating

Runtime head `0c1178f3b082fbc7f2e1060ee418925e49502245`; published baseline **0.0.35 · 15de8cc**. PR #733. This repairs a terrain-contact defect, not canopy attachment, art direction, hardware FPS or heat.

## Reproduction and cause

The read-only published-world scan records actual High near wood for 451 trees. Its low-vertex gaps are only search diagnostics: a high point on a root is not proof of air beneath it. The independent surface study loads the delivered near wood, reproduces the original planting/seat heights exactly and casts upward from below soil against double-sided geometry. The lowest surface at each probe is measured against terrain on a 5 cm grid. This confirms air under three replacement hero-oak-b roots. Labels and world positions are preserved in live-scan.json and surface-study.json.

Planting correctly keeps the original model's claim. Flare seating also used that model even when the visible model had changed. Check the replacement roots too, using the same original planting plane for both checks, and take only the lower seat. The old 1.5 m sink cap remains; it cannot compound, raise an existing tree, or move horizontal claims. Pines and shrubs keep existing policy.

| Tree | Origin x,z (m) | Maximum checked underside gap before → after |
| --- | --- | --- |
| tree:wild:35:34 | −153.84, 50.98 | 30.35 → 6.22 cm |
| tree:wild:40:35 | −121.25, 54.54 | 13.02 → −7.94 cm |
| tree:wild:36:37 | −149.38, 64.81 | 22.43 → −7.51 cm |

Negative is below soil. The first tree reaches the original sink cap: **6.22 cm remains**. This is a partial repair, not an all-root or all-LOD closure claim. Each checked grid falls below the regression's 8 cm threshold. Near root geometry is measured; every distant LOD is not independently certified.

## Tests and native proof

The regression calls the real old four-argument and new five-argument seating helper using real source assets and independent underside rays. It fails on pinned old code with 0.3035034 m exceeding 0.08 m; 18 focused tests and production build/typecheck pass on candidate. Same-model and already-buried controls keep the old seat; original cap and placement metadata are asserted.

All five native pose draw/triangle counter pairs also match before versus after. The first pose includes an identical cold setup difference in both worlds (311 draws / 3,271,278 triangles on image versus 309 / 3,271,276 on control); this is not claimed as a saving. Native captures construct two full worlds sequentially. A Vite transform supplies pinned 15de8cc flora.ts and treeGrounding.ts for the baseline and the actual candidate sources for the other world. No manual instance translation or borrowed geometry. The recorded source strings equal the runtime files. All 451 planting rows retain x/z, scale, yaw, tint, radius, labels, asset IDs and original planting heights; 18 trees seat farther down, none rises or exceeds the original cap. Colliders are built after the final seat by the ordinary world setup.

Five 640×360 post/MSAA poses: three eye-height root views, one **low diagnostic** view, and unchanged sea. Wind/time are fixed for static contact inspection. Each image/control pair is RGB-identical; affected before/after views intentionally change, including shadows and occlusion; sea is RGB-identical across worlds. Images are native full-world renders, **not screenshot acquisition directly from Pages**. Published live scan and exact old-height reproduction tie them to the baseline. No real-time motion or hardware timing claim.

## Cost and gate

Geometry buffers, materials, shaders, texture taps, per-frame logic and payload formats are unchanged. Construction performs an additional terrain/root query for replacement variants. This is a correctness fix, not a per-frame speed claim. Visibility may change from a tree moving down, so stock sampled render budgets are checked separately. See budget.log for exact live/candidate draws, triangles and zero-console-error result. Gate code is unmodified, no allowances, ordinary startup, no initialization script, actual exit zero: **play-gate: PASS 0c1178f3b**.

## Reproduce

From repository root, select software-WebGL Chrome using CHROME. Run sequentially:

```sh
npx vitest run tests/presentation/renderedRootSeating.test.ts tests/presentation/treeGrounding.test.ts tests/presentation/treeRaisedLodRoots.test.ts tests/presentation/floraPopulation.test.ts
npm run build
REPRO_INIT_FILE=docs/perf/RENDERED-ROOT-SEATING-PROOF/raster-suppression-init.js node docs/perf/RENDERED-ROOT-SEATING-PROOF/repro-native.mjs
node tools/play-gate.mjs --url BUILD_URL --budget-url https://ael-dev3.github.io/Tervain/ --head 0c1178f3b
```

PROOF_OUT selects output. Native script runs from repository root, pins baseline git objects and reads the included surface study; loading-only raster suppression is restored before images. Leave REPRO_INIT_FILE unset for the stock gate. To repeat the independent surface study, copy repro-surface-study.test.ts into tests/presentation/rootSeatStudy.test.ts, run Vitest, then remove the temporary test; ROOT_STUDY_OUT selects JSON output. The live scan requires a build exposing the same debug interfaces; ROOT_SCAN_OUT selects output. It is diagnostic only and does not modify production placement.
