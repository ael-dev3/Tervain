# Birch repair study: rejected under the near-view constraint

Live **0.0.33 · b317734**, High. Target `tree:wild:71:20`, birch/verdant-sentinel, base `(70.897643, 2.165980, -39.023334)`, scale `1.0636663068`.

No production fix is included. Neither tested small static repair meets the requested combination of visible distance improvement and unchanged near views. This does **not** establish that a camera-dependent repair cannot work.

## Methods and results

All audits use unmasked retained geometry, gap 0.75 world m, woodReach 1.5 world m, maxOperations 300000000. Distance-flagged components are candidates, not automatically visually separate masses. Helper sources match main b317734 exactly; hashes are retained.

| Full-detail source control | Distance flags | Flagged groups | Leaf triangles |
| --- | ---: | ---: | ---: |
| Original | 76 | 11 | 11,138 |
| Existing seating helper | 63 | 3 | 11,138 |
| Existing culling helper | 0 | 0 | 10,986 |

Seating moves eight eligible groups (13 flagged components). The helper retains the broad groups whose radius overlaps wood rather than forcing all flags to zero. The indexed source width/height/depth remain identical in both controls; that alone does not preserve the rendered view.

### Trial A: modify middle/far colour LODs only

Near geometry remains unchanged. Seating moves no middle/far groups. Culling clears the middle audit (403→0 flags) by deleting 806 of 4,348 middle leaf triangles, **18.54%**. Far flags fall 2→0 by deleting 13 of 1,442 triangles.

Five native camera comparisons, including the two original poses and approximately 45/70/120 m offsets, have **zero changed channels** for both options and restored controls. Submitted draws/triangles stay equal. This is an ineffective High repair, not a successful pixel-identical fix: default High returns `[1,0,0]` at every visible distance (`src/presentation/floraPopulation.ts`, `floraLodWeights`). It keeps the full source mesh to preserve silhouettes. Improving an explicitly selected middle/far audit does not repair the High image.

### Trial B: modify full-detail colour geometry

Middle/far geometry remains unchanged. The clone adapter aliases the live distance-coverage attribute so instance packing remains current. Each study edits a shared template and therefore affects its matching placements, not only one instance.

| Retained camera pose | Seating changed pixels | Culling changed pixels | Restored changed pixels |
| --- | ---: | ---: | ---: |
| Original wider pose | 926 | 1,459 | 0 |
| Original close pose | 1,488 | 2,090 | 0 |
| Approximately 70 m offset | 0 | 0 | 0 |

Counts above mean any changed RGB channel at a pixel, at 640×360. The close seating difference is about 0.65% of the frame. These are measured changes, not an art-quality score. The close-view preservation requirement fails, and the retained distant pose shows no visible benefit. A different far angle may behave differently; no universal invisibility claim is made.

| Close-pose colour-frame work | Original | Seat | Cull |
| --- | ---: | ---: | ---: |
| Draws | 201 | 201 | 201 |
| Triangles | 4,502,744 | 4,502,744 | 4,501,528 |

These are custom frozen-shadow study samples, **not stock budget-gate numbers**. The unmodified budget gate and a new regression test were not run because no production candidate passed the visual constraint. No PASS receipt, console-clean result, hardware timing, Mac FPS or heat improvement is claimed.

## Native capture scope

Both trials use the published full world, High/MSAA4, normal post rendering, frozen clock/wind, valid GL checks and nonblank images. Startup raster suppression is restored before retained rendering. At each pose the original native shadow map is warmed and then frozen; original casters remain unchanged while colour/depth meshes are compared. Planted shade/terrain/grass are not regenerated from trial geometry. This isolates the colour repair and is not a compiled production-build or repaired-shadow verification. Restored native frames are exact within each trial; no cross-browser pixel comparison is claimed.

The original two camera pairs are `(85,5,-24)→(72,12,-39)` and `(82,8,-28)→(76.4,9.42,-33.56)`. Full coordinates, costs, source measurements and hashes are in the reports. `*-native.png`, `*-seat.png`, `*-cull.png`, and `*-restored.png` retain all frames. The distant-only adapter's unchanged-source controls are exact at every retained High pose; no other preset/path is validated.

The delivered read-only scripts change only import/output locations and add an optional `TERVAIN_URL` compared with those used for these receipts. From the repository root, run `node docs/perf/BIRCH-SAFE-REPAIR/distant-study.mjs` or `node docs/perf/BIRCH-SAFE-REPAIR/full-detail-study.mjs` with the existing software-browser setup. They start and stop their own source server on port 5302 and leave production geometry restored. Outputs go under `artifacts/birch-safe-repair/`. Helpers must match `helper-hashes.json` to reproduce this study. Image-difference tables are computed from retained lossless PNGs after capture.

## Conclusion and next target

A middle/far-only edit cannot affect the reported default High image. The small full-detail static alternatives change the near view. A camera-dependent colour repair would need separate design, cost and shadow/capture validation; it is not silently introduced here. The original 76 near flags remain open. No production source change, fix PR or main push is included.

Moved to the next measured target: `tree:wild:58:16`, birch/tree-1527, base `(-12.341355,4.212484,-62.427981)`, scale `1.0850455875`. Exported native position/index buffers independently reproduce **55 flags / 7 groups**. The same offline seating control leaves **42 / 2**; culling gives zero flags but removes 110 leaf triangles. Original positions remain unchanged in that offline control. This is a new concrete target to trace, not another validated repair. Its native rendering and opaque-surface connectivity still require investigation.
