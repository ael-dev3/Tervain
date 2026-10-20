# Skip an unused foliage anchoring search

Candidate `e14c51d76bd3e1d61308842c06e1da70480e58e6`, baseline/source of published 0.0.37 `a42f11f60aa5657c71c513517fc3fdfbe9d1d906`. When the contact check already found no far parts, do not build the unused nearest-wood index. This also avoids that index on the final successful repair round. Thresholds, geometry policy and per-frame code do not change.

## Real production-input proof

Retained **10 actual pre-anchor calls** during native High world construction, including template leader and final in-place calls. Original and candidate replay on identical cloned wood inputs: every output attribute/index, twig count, twig metadata and returned-reference behavior match exactly. Leaf buffers are never modified. Both sources are imported from the pinned checkout/revision; diagnostic hooks are not in production.

| Loading search work | Original | Candidate |
| --- | ---: | ---: |
| Index builds | 17 | 7 |
| Indexed wood triangles | 124,977 | 51,813 |
| Typed-array index payload bytes | 9,498,252 | 3,937,788 |

Typed payload counts the three Float32 arrays (18 values/triangle) and Int32 order (one/triangle): 76 bytes per indexed triangle. It excludes JS node/sort/temporary storage. This is construction CPU allocation, not GPU upload, VRAM or frame cost.

Two warm replay pairs, six rotating measured rounds including an unchanged-original control. Timings include equal input wood cloning/disposal; not whole-world startup or gameplay frame time. Raw reports and timings: [report.json](report.json), [summary.json](summary.json).

| Mode | Mean ms / full input replay | Median | Min–max | Samples |
| --- | ---: | ---: | ---: | ---: |
| before | 577.53 | 572.55 | 554.30–617.60 | 6 |
| after | 498.57 | 492.85 | 481.70–525.80 | 6 |
| control | 571.62 | 575.50 | 551.70–594.00 | 6 |

## Native captures

Two independently constructed native High worlds, original/candidate source, 640×360 DPR1, frozen time/wind and native post/MSAA. Raster fully restored before images. Five fixed eye-height poses, two repeats/mode: **20 PNGs RGB-identical by pose**, independently decoded by Sharp and Pillow. Eye positions 20 m south of each tree are not certified walkable camera routes, and can be foreground-occluded. [Hashes](independent-pixels.json).

| Pose | Draws (both) | Triangles (both) | Changed RGB pixels |
| --- | ---: | ---: | ---: |
| 0: tree:wild:55:3 | 206 | 1,818,284 | 0 |
| 1: tree:wild:71:20 | 440 | 5,648,570 | 0 |
| 2: tree:palm:13:13 | 185 | 1,508,668 | 0 |
| 3: forest | 607 | 7,408,869 | 0 |
| 4: sea | 139 | 778,897 | 0 |

Per-frame JS, shaders, texture taps and render passes: unchanged; change runs only during anchoring construction. No hardware/Mac FPS or heat improvement is claimed. The unmodified compiled exact-head budget receipt will be posted on #740.

## Independent live verification

[live37-all-lods.json](live37-all-lods.json), public Pages version 0.0.37, revision a42f11f, all 451 High registered trees, species/population complete. Unmasked gap 0.75 m, wood reach 1.5 m, 300M operation ceiling; all three LOD reports complete.

Near: **0 distance-flagged cards / 0 groups**, absolute gate passes. Mid: **3,796 cards / 201 groups**; far: **14,972 cards / 522 groups**, absolute gates fail. Whole-crown disconnected candidates are zero at all LODs. Distance flags alone do not establish visible detached floaters; no alpha-aware or all-motion clearance is claimed. Scope is broader than the release's reported 337-tree population and is kept separate. Per-species residual table posted on #326.

Repros from the checkout with dependencies/headless Chrome configured: `node tools/repro-supported-foliage-index.mjs [output-dir]`; `node tools/audit-live-foliage-all-lods.mjs [build-url] [output-dir]`. The first imports original pinned source and current candidate; the second is read-only on the hosted build.
